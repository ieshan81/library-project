/*********************************************
 * NETLIFY IDENTITY: LOGIN & LOGOUT
 *********************************************/
document.addEventListener('DOMContentLoaded', () => {
  // Auto-open the Identity widget if not logged in
  if (window.netlifyIdentity) {
    window.netlifyIdentity.on('init', user => {
      if (!user) {
        window.netlifyIdentity.open();
      }
    });
    window.netlifyIdentity.on('login', user => {
      console.log('Logged in as:', user.email);
      window.location.href = 'home.html';
    });
    window.netlifyIdentity.on('logout', () => {
      console.log('User logged out');
      window.location.href = 'index.html';
    });
  }
  
  // Optional manual login button (if present)
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) {
    loginBtn.addEventListener('click', e => {
      e.preventDefault();
      if (window.netlifyIdentity) window.netlifyIdentity.open();
    });
  }
  
  // Logout button(s)
  const logoutBtns = document.querySelectorAll('#logoutBtn');
  logoutBtns.forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      if (window.netlifyIdentity) window.netlifyIdentity.logout();
    });
  });
});

/*********************************************
 * BOOKS LISTING: FETCH BOOKS FROM NETLIFY FUNCTION
 *********************************************/
function fetchBooksList(callback) {
  const functionURL = '/.netlify/functions/listBooks';
  fetch(functionURL)
    .then(response => response.json())
    .then(data => {
      console.log("Books fetched:", data);
      if (data.books) callback(data.books);
      else callback([]);
    })
    .catch(err => {
      console.error("Error fetching books:", err);
      callback([]);
    });
}

/*********************************************
 * BOOK METADATA: FETCH FROM GOOGLE BOOKS / OPEN LIBRARY
 *********************************************/
function fetchBookData(title, callback) {
  const cacheKey = `bookData_${title}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    callback(JSON.parse(cached));
    return;
  }
  const googleUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(title)}`;
  fetch(googleUrl)
    .then(response => response.json())
    .then(data => {
      if (data.totalItems > 0 && data.items && data.items[0].volumeInfo) {
        const info = data.items[0].volumeInfo;
        let coverUrl = info.imageLinks ? info.imageLinks.thumbnail : null;
        if (coverUrl && coverUrl.startsWith('http://')) {
          coverUrl = coverUrl.replace('http://', 'https://');
        }
        const synopsis = info.description || "";
        const authors = info.authors ? info.authors.join(", ") : "";
        const publishedYear = info.publishedDate ? info.publishedDate.slice(0,4) : "";
        const categories = info.categories || [];
        if (coverUrl) {
          const img = new Image();
          img.src = coverUrl;
          img.onload = () => {
            const bookData = { coverUrl, synopsis, authors, publishedYear, categories };
            localStorage.setItem(cacheKey, JSON.stringify(bookData));
            callback(bookData);
          };
          img.onerror = () => fetchOpenLibrary(title, callback);
        } else {
          fetchOpenLibrary(title, callback);
        }
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
        const bookData = { coverUrl, synopsis, authors, publishedYear, categories };
        localStorage.setItem(`bookData_${title}`, JSON.stringify(bookData));
        callback(bookData);
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
 * HELPER: CLEAN TITLE FROM FILENAME
 *********************************************/
function cleanTitle(filename) {
  return filename.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ').trim();
}

/*********************************************
 * CREATE BOOK ELEMENT (with tooltip)
 *********************************************/
function createBookElement(book, title, data) {
  const bookElement = document.createElement('div');
  bookElement.className = 'book';
  bookElement.innerHTML = `
    <img src="${data.coverUrl || 'images/placeholder.jpg'}" alt="${title}">
    <h3>${title}</h3>
    <p>${data.authors}</p>
    <div class="tooltip">
      <p><strong>Synopsis:</strong> ${data.synopsis || "No synopsis available"}</p>
      <p><strong>Author:</strong> ${data.authors || "Unknown"}</p>
      <p><strong>Year:</strong> ${data.publishedYear || "Unknown"}</p>
      <p><strong>Categories:</strong> ${data.categories.join(", ") || "None"}</p>
    </div>
  `;
  bookElement.addEventListener('click', () => {
    window.location.href = `reader.html?bookName=${encodeURIComponent(book.name)}&download_url=${encodeURIComponent(book.download_url)}`;
  });
  return bookElement;
}

/*********************************************
 * HOME PAGE LOGIC
 *********************************************/
function loadHomePage() {
  // Show "Continue Reading" if progress exists
  const currentReads = JSON.parse(localStorage.getItem('currentReads')) || [];
  const continueSection = document.getElementById('continue-reading-container');
  if (continueSection && currentReads.length > 0) {
    currentReads.forEach(item => {
      fetchBookData(item.title, data => {
        const fakeBook = { name: item.name, download_url: item.download_url };
        const bookElem = createBookElement(fakeBook, item.title, data);
        continueSection.appendChild(bookElem);
      });
    });
  }

  // Fetch list and fill other rows
  fetchBooksList(books => {
    const slice = books.slice(0, 5);
    const nextContainer = document.getElementById('next-read-container');
    const topPicksContainer = document.getElementById('top-picks-container');
    const fantasyContainer = document.getElementById('fantasy-container');

    if (nextContainer) {
      slice.forEach(book => {
        const title = cleanTitle(book.name);
        fetchBookData(title, data => {
          const elem = createBookElement(book, title, data);
          nextContainer.appendChild(elem);
        });
      });
    }
    if (topPicksContainer) {
      slice.forEach(book => {
        const title = cleanTitle(book.name);
        fetchBookData(title, data => {
          const elem = createBookElement(book, title, data);
          topPicksContainer.appendChild(elem);
        });
      });
    }
    if (fantasyContainer) {
      slice.forEach(book => {
        const title = cleanTitle(book.name);
        fetchBookData(title, data => {
          if (data.categories.map(c => c.toLowerCase()).includes('fantasy')) {
            const elem = createBookElement(book, title, data);
            fantasyContainer.appendChild(elem);
          }
        });
      });
    }
  });
}

/*********************************************
 * LIBRARY PAGE LOGIC
 *********************************************/
function loadLibraryPage() {
  fetchBooksList(books => {
    const librarySection = document.getElementById('library-container');
    if (!librarySection) return;
    books.forEach(book => {
      const title = cleanTitle(book.name);
      fetchBookData(title, data => {
        const elem = createBookElement(book, title, data);
        librarySection.appendChild(elem);
      });
    });
  });
}

/*********************************************
 * DASHBOARD PAGE LOGIC
 *********************************************/
function loadDashboardPage() {
  fetchBooksList(books => {
    const tbrSection = document.getElementById('tbr-container');
    if (tbrSection) {
      books.slice(0, 5).forEach(book => {
        const title = cleanTitle(book.name);
        fetchBookData(title, data => {
          const elem = createBookElement(book, title, data);
          tbrSection.appendChild(elem);
        });
      });
    }
    const likedSection = document.getElementById('liked-container');
    if (likedSection) {
      books.slice(-5).forEach(book => {
        const title = cleanTitle(book.name);
        fetchBookData(title, data => {
          const elem = createBookElement(book, title, data);
          likedSection.appendChild(elem);
        });
      });
    }
  });
}

/*********************************************
 * READER PAGE LOGIC (Advanced PDF Viewer)
 *********************************************/
let pdfDoc = null;
let currentPage = 1;
let totalPages = 0;
let isTwoPageLayout = false;

function loadReaderPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const bookName = urlParams.get('bookName');
  const downloadUrl = urlParams.get('download_url');
  if (!downloadUrl || !bookName) {
    console.error("Missing parameters in URL");
    return;
  }

  const canvas1 = document.getElementById('pdf-canvas-1');
  const canvas2 = document.getElementById('pdf-canvas-2');
  const pageNumSpan = document.getElementById('page-num');
  const pageCountSpan = document.getElementById('page-count');
  const prevBtn = document.getElementById('prev-page');
  const nextBtn = document.getElementById('next-page');
  const pageInput = document.getElementById('page-input');
  const goPageBtn = document.getElementById('go-page');
  const toggleLayoutBtn = document.getElementById('toggle-layout');
  const bookmarkBtn = document.getElementById('bookmark-btn');
  const fullscreenBtn = document.getElementById('fullscreen-btn');

  pdfjsLib.getDocument(downloadUrl).promise.then(pdf => {
    pdfDoc = pdf;
    totalPages = pdf.numPages;
    pageCountSpan.textContent = totalPages;
    // Load saved reading progress if available
    const currentReads = JSON.parse(localStorage.getItem('currentReads')) || [];
    const saved = currentReads.find(item => item.name === bookName);
    if (saved) currentPage = saved.page;
    renderPages();
  }).catch(err => {
    console.error("Error loading PDF:", err);
  });

  function renderPages() {
    if (!pdfDoc) return;
    pageNumSpan.textContent = currentPage;
    renderPage(currentPage, canvas1);
    if (isTwoPageLayout && currentPage < totalPages) {
      canvas2.style.display = 'block';
      renderPage(currentPage + 1, canvas2);
    } else {
      canvas2.style.display = 'none';
    }
    saveProgress();
  }

  function renderPage(num, canvas) {
    pdfDoc.getPage(num).then(page => {
      const ctx = canvas.getContext('2d');
      const viewport = page.getViewport({ scale: 1.0 });
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      page.render({ canvasContext: ctx, viewport: viewport });
    });
  }

  function saveProgress() {
    const currentReads = JSON.parse(localStorage.getItem('currentReads')) || [];
    let existing = currentReads.find(item => item.name === bookName);
    if (existing) {
      existing.page = currentPage;
    } else {
      existing = { name: bookName, title: cleanTitle(bookName), download_url: downloadUrl, page: currentPage };
      currentReads.push(existing);
    }
    localStorage.setItem('currentReads', JSON.stringify(currentReads));
  }

  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage = isTwoPageLayout ? Math.max(1, currentPage - 2) : currentPage - 1;
      renderPages();
    }
  });

  nextBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage = isTwoPageLayout ? currentPage + 2 : currentPage + 1;
      renderPages();
    }
  });

  goPageBtn.addEventListener('click', () => {
    const p = parseInt(pageInput.value, 10);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      currentPage = isTwoPageLayout && p % 2 === 0 ? p - 1 : p;
      renderPages();
    }
  });

  toggleLayoutBtn.addEventListener('click', () => {
    isTwoPageLayout = !isTwoPageLayout;
    renderPages();
  });

  bookmarkBtn.addEventListener('click', () => {
    alert(`Bookmarked page ${currentPage}`);
    // (You could also store bookmarks in localStorage if desired)
  });

  fullscreenBtn.addEventListener('click', () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    } else {
      alert("Fullscreen mode not supported.");
    }
  });
}

/*********************************************
 * PAGE LOAD ROUTER
 *********************************************/
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  if (path.includes('home.html')) loadHomePage();
  else if (path.includes('library.html')) loadLibraryPage();
  else if (path.includes('dashboard.html')) loadDashboardPage();
  else if (path.includes('reader.html')) loadReaderPage();
});
