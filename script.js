/*********************************************************
 * COMPLETE script.js
 * 
 * This version fetches the PDF list from a Netlify Function
 * at "https://<your-site>.netlify.app/.netlify/functions/listBooks"
 * instead of a local books.json file.
 *********************************************************/
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;

  /*********************************************
   * 1) FAKE AUTH (DEMO ONLY)
   *********************************************/
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      localStorage.setItem('loggedIn', 'true');
      window.location.href = 'home.html';
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('loggedIn');
      window.location.href = 'index.html';
    });
  }

  const restrictedPages = ['home.html', 'library.html', 'dashboard.html', 'reader.html'];
  const isRestricted = restrictedPages.some(page => path.endsWith(page));
  if (isRestricted && !localStorage.getItem('loggedIn')) {
    window.location.href = 'index.html';
  }

  /*********************************************
   * 2) FETCH BOOK LIST FROM NETLIFY FUNCTION
   *********************************************/
  function fetchBooksList(callback) {
    // Replace <your-site> with your actual Netlify subdomain
    const functionURL = 'https://<your-site>.netlify.app/.netlify/functions/listBooks';

    fetch(functionURL)
      .then(response => response.json())
      .then(data => {
        if (data && data.books) {
          callback(data.books);
        } else {
          callback([]);
        }
      })
      .catch(err => {
        console.error("Error fetching book list from Netlify function:", err);
        callback([]);
      });
  }

  /*********************************************
   * 3) GOOGLE/OPEN LIBRARY API: Cover + Metadata
   *********************************************/
  function fetchBookData(title, callback) {
    const googleUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(title)}`;

    fetch(googleUrl)
      .then(response => response.json())
      .then(data => {
        if (data.totalItems > 0 && data.items && data.items[0].volumeInfo) {
          const info = data.items[0].volumeInfo;
          const coverUrl = info.imageLinks ? info.imageLinks.thumbnail : null;
          const synopsis = info.description || "";
          const authors = info.authors ? info.authors.join(", ") : "";
          const publishedYear = info.publishedDate ? info.publishedDate.slice(0,4) : "";
          const categories = info.categories || [];
          callback({ coverUrl, synopsis, authors, publishedYear, categories });
        } else {
          fetchOpenLibrary(title, callback);
        }
      })
      .catch(err => {
        console.error("Google Books error:", err);
        fetchOpenLibrary(title, callback);
      });
  }

  function fetchOpenLibrary(title, callback) {
    const olUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}`;

    fetch(olUrl)
      .then(response => response.json())
      .then(data => {
        if (data.docs && data.docs.length > 0) {
          const doc = data.docs[0];
          const coverID = doc.cover_i;
          const coverUrl = coverID ? `https://covers.openlibrary.org/b/id/${coverID}-M.jpg` : null;
          const synopsis = doc.first_sentence ? doc.first_sentence.join(" ") : "";
          const authors = doc.author_name ? doc.author_name.join(", ") : "";
          const publishedYear = doc.first_publish_year ? doc.first_publish_year.toString() : "";
          const categories = doc.subject ? doc.subject.slice(0,2) : [];
          callback({ coverUrl, synopsis, authors, publishedYear, categories });
        } else {
          callback({ coverUrl: null, synopsis: "", authors: "", publishedYear: "", categories: [] });
        }
      })
      .catch(err => {
        console.error("Open Library error:", err);
        callback({ coverUrl: null, synopsis: "", authors: "", publishedYear: "", categories: [] });
      });
  }

  /*********************************************
   * 4) LOCALSTORAGE HELPERS (TBR, Liked, etc.)
   *********************************************/
  function getLocalStorageArray(key) {
    const data = localStorage.getItem(key);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        return [];
      }
    }
    return [];
  }

  function setLocalStorageArray(key, arr) {
    localStorage.setItem(key, JSON.stringify(arr));
  }

  function updateCurrentRead(book, page) {
    let currentReads = getLocalStorageArray('currentReads');
    const idx = currentReads.findIndex(entry => entry.book === book);
    if (idx !== -1) {
      currentReads[idx].page = page;
      currentReads[idx].lastUpdated = new Date().toISOString();
    } else {
      currentReads.push({ book, page, lastUpdated: new Date().toISOString() });
    }
    setLocalStorageArray('currentReads', currentReads);
  }

  function addToTBR(bookFile) {
    let tbr = getLocalStorageArray('tbrBooks');
    if (!tbr.includes(bookFile)) {
      tbr.push(bookFile);
      setLocalStorageArray('tbrBooks', tbr);
      alert('Added to your TBR list.');
    } else {
      alert('Already in TBR list.');
    }
  }

  function addToLiked(bookFile) {
    let liked = getLocalStorageArray('likedBooks');
    if (!liked.includes(bookFile)) {
      liked.push(bookFile);
      setLocalStorageArray('likedBooks', liked);
      alert('Added to liked books.');
    } else {
      alert('Already in liked books.');
    }
  }

  /*********************************************
   * 5) CREATE A "NETFLIX-LIKE" HOVER CARD
   *********************************************/
  function createNetflixHoverCard(bookFile) {
    // bookFile is something like "Harry_Potter_And_The_Sorcerers_Stone-J.K._Rowling.pdf"
    const displayTitle = bookFile.replace('.pdf', '').replace(/[_-]/g, ' ');

    // Outer container
    const cardDiv = document.createElement('div');
    cardDiv.className = 'nf-hover-card';

    // We'll fetch metadata from the APIs
    fetchBookData(displayTitle, ({ coverUrl, synopsis, authors, publishedYear, categories }) => {
      const cover = coverUrl || 'images/placeholder.jpg';
      const categoryText = categories.length > 0 ? categories.join(", ") : "";
      // We'll create an expanded overlay that shows more details
      cardDiv.innerHTML = `
        <div class="card-poster" style="background-image: url('${cover}')"></div>
        <div class="card-overlay">
          <div class="overlay-content">
            <h3 class="overlay-title">${displayTitle}</h3>
            <p class="overlay-meta">
              ${publishedYear ? publishedYear : 'Year'}
              ${authors ? ' | ' + authors : ''}
              ${categoryText ? ' | ' + categoryText : ''}
            </p>
            <p class="overlay-synopsis">${synopsis || 'No synopsis available.'}</p>
            <div class="overlay-actions">
              <button class="start-reading-btn">Start Reading</button>
              <button class="like-btn">Like</button>
              <button class="tbr-btn">TBR</button>
            </div>
            <div class="overlay-chapters">
              <h4>Chapters</h4>
              <p>Chapter 1, Chapter 2, Chapter 3, ...</p>
            </div>
          </div>
        </div>
      `;

      // Start Reading
      cardDiv.querySelector('.start-reading-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        // We'll open the local PDF in reader.html
        window.location.href = `reader.html?book=${encodeURIComponent(bookFile)}`;
      });

      // Like / TBR
      cardDiv.querySelector('.like-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        addToLiked(bookFile);
      });
      cardDiv.querySelector('.tbr-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        addToTBR(bookFile);
      });
    });

    // If user clicks the poster or overlay, open the PDF
    cardDiv.addEventListener('click', () => {
      window.location.href = `reader.html?book=${encodeURIComponent(bookFile)}`;
    });

    return cardDiv;
  }

  /*********************************************
   * 6) HOME PAGE LOGIC
   *********************************************/
  if (path.endsWith('home.html')) {
    fetchBooksList(allBooks => {
      // "Continue Reading" row
      const currentReads = getLocalStorageArray('currentReads');
      const row0Section = document.getElementById('row-0');
      const continueReadingContainer = document.getElementById('continue-reading-container');
      if (currentReads.length > 0) {
        row0Section.style.display = 'block';
        // Sort by most recent update
        const sortedReads = currentReads.slice().sort((a,b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
        sortedReads.forEach(entry => {
          continueReadingContainer.appendChild(createNetflixHoverCard(entry.book));
        });
      } else {
        row0Section.style.display = 'none';
      }

      // Row 1: "Your Next Read" => first 5
      const row1 = document.getElementById('next-read-container');
      allBooks.slice(0, 5).forEach(bookFile => {
        row1.appendChild(createNetflixHoverCard(bookFile));
      });

      // Row 2: "Top Picks" => next 5
      const row2 = document.getElementById('top-picks-container');
      allBooks.slice(5, 10).forEach(bookFile => {
        row2.appendChild(createNetflixHoverCard(bookFile));
      });

      // Row 3: "Fantasy" => next 5
      const row3 = document.getElementById('fantasy-container');
      allBooks.slice(10, 15).forEach(bookFile => {
        row3.appendChild(createNetflixHoverCard(bookFile));
      });
    });
  }

  /*********************************************
   * 7) LIBRARY PAGE LOGIC
   *********************************************/
  if (path.endsWith('library.html')) {
    const libraryContainer = document.getElementById('library-container');
    const searchBar = document.getElementById('searchBar');

    fetchBooksList(allBooks => {
      allBooks.forEach(bookFile => {
        libraryContainer.appendChild(createNetflixHoverCard(bookFile));
      });

      if (searchBar) {
        searchBar.addEventListener('input', () => {
          const query = searchBar.value.toLowerCase();
          document.querySelectorAll('.nf-hover-card').forEach(item => {
            const titleElem = item.querySelector('.overlay-title');
            const titleText = titleElem ? titleElem.textContent.toLowerCase() : '';
            item.style.display = titleText.includes(query) ? 'inline-block' : 'none';
          });
        });
      }
    });
  }

  /*********************************************
   * 8) DASHBOARD PAGE LOGIC
   *********************************************/
  if (path.endsWith('dashboard.html')) {
    const tbrContainer = document.getElementById('tbr-container');
    const likedContainer = document.getElementById('liked-container');
    const tbrBooks = getLocalStorageArray('tbrBooks');
    const likedBooks = getLocalStorageArray('likedBooks');

    // We still fetch the entire list, though we only need it if you want metadata
    // for TBR/liked books. If you just want to display them, you can skip fetchBooksList.
    fetchBooksList(allBooks => {
      // TBR
      if (tbrBooks.length > 0) {
        tbrBooks.forEach(bookFile => {
          tbrContainer.appendChild(createNetflixHoverCard(bookFile));
        });
      } else {
        tbrContainer.innerHTML = '<p>No books in your TBR list.</p>';
      }

      // Liked
      if (likedBooks.length > 0) {
        likedBooks.forEach(bookFile => {
          likedContainer.appendChild(createNetflixHoverCard(bookFile));
        });
      } else {
        likedContainer.innerHTML = '<p>No liked books.</p>';
      }
    });
  }

  /*********************************************
   * 9) READER PAGE LOGIC (PDF.js with local PDFs)
   *********************************************/
  if (path.endsWith('reader.html')) {
    const urlParams = new URLSearchParams(window.location.search);
    const bookParam = urlParams.get('book');
    if (!bookParam) {
      console.error("No 'book' param found in URL.");
      return;
    }
    // PDF location: /books/<bookParam>
    const pdfUrl = `books/${bookParam}`;
    console.log("Loading local PDF from:", pdfUrl);

    let pdfDoc = null,
        pageNum = 1,
        pageRendering = false,
        pageNumPending = null,
        twoPageLayout = false;
    const scale = 1.5;

    const canvas1 = document.getElementById('pdf-canvas-1');
    const canvas2 = document.getElementById('pdf-canvas-2');
    const ctx1 = canvas1.getContext('2d');
    const ctx2 = canvas2.getContext('2d');

    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.6.172/pdf.worker.min.js';

    function renderPage(num) {
      pageRendering = true;
      pdfDoc.getPage(num).then(page => {
        const viewport = page.getViewport({ scale });
        canvas1.width = viewport.width;
        canvas1.height = viewport.height;
        return page.render({ canvasContext: ctx1, viewport }).promise;
      })
      .then(() => {
        if (twoPageLayout && (num + 1) <= pdfDoc.numPages) {
          canvas2.style.display = 'block';
          pdfDoc.getPage(num + 1).then(page2 => {
            const viewport2 = page2.getViewport({ scale });
            canvas2.width = viewport2.width;
            canvas2.height = viewport2.height;
            return page2.render({ canvasContext: ctx2, viewport: viewport2 }).promise;
          })
          .then(() => {
            pageRendering = false;
            document.getElementById('page-num').textContent = `${num} - ${num + 1}`;
            if (pageNumPending !== null) {
              let tmp = pageNumPending;
              pageNumPending = null;
              renderPage(tmp);
            }
            updateCurrentRead(bookParam, num);
          });
        } else {
          canvas2.style.display = 'none';
          pageRendering = false;
          document.getElementById('page-num').textContent = num;
          if (pageNumPending !== null) {
            let tmp = pageNumPending;
            pageNumPending = null;
            renderPage(tmp);
          }
          updateCurrentRead(bookParam, num);
        }
      });
    }

    function queueRenderPage(num) {
      if (pageRendering) {
        pageNumPending = num;
      } else {
        renderPage(num);
      }
    }

    document.getElementById('prev-page').addEventListener('click', () => {
      if (twoPageLayout) {
        if (pageNum > 1) {
          pageNum = (pageNum - 2) >= 1 ? (pageNum - 2) : 1;
          queueRenderPage(pageNum);
        }
      } else {
        if (pageNum > 1) {
          pageNum--;
          queueRenderPage(pageNum);
        }
      }
    });

    document.getElementById('next-page').addEventListener('click', () => {
      if (twoPageLayout) {
        if ((pageNum + 1) < pdfDoc.numPages) {
          pageNum = (pageNum + 2) <= pdfDoc.numPages ? (pageNum + 2) : (pdfDoc.numPages - 1);
          queueRenderPage(pageNum);
        }
      } else {
        if (pageNum < pdfDoc.numPages) {
          pageNum++;
          queueRenderPage(pageNum);
        }
      }
    });

    document.getElementById('go-page').addEventListener('click', () => {
      const pageInput = document.getElementById('page-input').value;
      let target = parseInt(pageInput, 10);
      if (!isNaN(target) && target >= 1 && target <= pdfDoc.numPages) {
        if (twoPageLayout && target % 2 === 0) {
          target = target - 1;
        }
        pageNum = target;
        queueRenderPage(pageNum);
      }
    });

    document.getElementById('toggle-layout').addEventListener('click', () => {
      twoPageLayout = !twoPageLayout;
      const toggleBtn = document.getElementById('toggle-layout');
      toggleBtn.textContent = twoPageLayout ? 'Single Page Layout' : 'Two-Page Layout';
      if (twoPageLayout && (pageNum % 2 === 0)) {
        pageNum = pageNum - 1;
      }
      queueRenderPage(pageNum);
    });

    document.getElementById('bookmark-btn').addEventListener('click', () => {
      updateCurrentRead(bookParam, pageNum);
      alert(`Bookmarked at page ${pageNum}`);
    });

    // Fullscreen logic
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const readerContainer = document.querySelector('.pdf-reader-container');

    fullscreenBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        if (readerContainer.requestFullscreen) {
          readerContainer.requestFullscreen();
        } else if (readerContainer.webkitRequestFullscreen) {
          readerContainer.webkitRequestFullscreen();
        } else if (readerContainer.msRequestFullscreen) {
          readerContainer.msRequestFullscreen();
        }
        fullscreenBtn.textContent = 'Exit Fullscreen';
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen();
        }
        fullscreenBtn.textContent = 'Fullscreen';
      }
    });

    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement) {
        fullscreenBtn.textContent = 'Fullscreen';
      }
    });

    document.addEventListener('keydown', e => {
      if (document.fullscreenElement === readerContainer) {
        if (e.key === 'ArrowLeft') queueRenderPage(pageNum - 1);
        if (e.key === 'ArrowRight') queueRenderPage(pageNum + 1);
      }
    });

    // Load the local PDF using PDF.js
    pdfjsLib.getDocument(pdfUrl).promise.then(pdf => {
      pdfDoc = pdf;
      document.getElementById('page-count').textContent = pdfDoc.numPages;
      let currentReads = getLocalStorageArray('currentReads');
      const saved = currentReads.find(entry => entry.book === bookParam);
      if (saved) {
        pageNum = saved.page;
      }
      if (pageNum < 1 || pageNum > pdfDoc.numPages) {
        pageNum = 1;
      }
      renderPage(pageNum);
    })
    .catch(err => {
      console.error("Failed to load local PDF:", pdfUrl, err);
      alert("Error loading PDF. Check console for details.");
    });
  }
});
