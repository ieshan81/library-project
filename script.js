/*********************************************
 * NETLIFY IDENTITY: AUTO-OPEN, LOGIN, LOGOUT
 *********************************************/
document.addEventListener('DOMContentLoaded', () => {
  if (window.netlifyIdentity) {
    // If not logged in, open the widget automatically
    window.netlifyIdentity.on('init', user => {
      if (!user) {
        window.netlifyIdentity.open();
      }
    });
    // Redirect after login
    window.netlifyIdentity.on('login', user => {
      console.log('Logged in as:', user.email);
      window.location.href = 'home.html';
    });
    // Redirect after logout
    window.netlifyIdentity.on('logout', () => {
      console.log('User logged out');
      window.location.href = 'index.html';
    });
  }
  
  // Optional manual login button
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) {
    loginBtn.addEventListener('click', e => {
      e.preventDefault();
      if (window.netlifyIdentity) {
        window.netlifyIdentity.open();
      }
    });
  }
  
  // Logout buttons
  const logoutBtns = document.querySelectorAll('#logoutBtn');
  logoutBtns.forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      if (window.netlifyIdentity) {
        window.netlifyIdentity.logout();
      }
    });
  });
});

/*********************************************
 * USER-SPECIFIC STORAGE HELPERS
 *********************************************/
function getUserId() {
  const user = window.netlifyIdentity && window.netlifyIdentity.currentUser();
  return user ? user.id : 'guest';
}
function getUserList(key) {
  const userId = getUserId();
  return JSON.parse(localStorage.getItem(key + '_' + userId)) || [];
}
function setUserList(key, list) {
  const userId = getUserId();
  localStorage.setItem(key + '_' + userId, JSON.stringify(list));
}

/*********************************************
 * FETCH BOOKS FROM NETLIFY FUNCTION
 *********************************************/
function fetchBooksList(callback) {
  const functionURL = '/.netlify/functions/listBooks';
  fetch(functionURL)
    .then(response => response.json())
    .then(data => {
      if (data.books) callback(data.books);
      else callback([]);
    })
    .catch(err => {
      console.error("Error fetching books:", err);
      callback([]);
    });
}

/*********************************************
 * FETCH BOOK METADATA (Google Books / Open Library)
 *********************************************/
function fetchBookData(title, callback) {
  const cacheKey = 'bookData_' + title;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    callback(JSON.parse(cached));
    return;
  }
  const googleUrl = 'https://www.googleapis.com/books/v1/volumes?q=' + encodeURIComponent(title);
  fetch(googleUrl)
    .then(r => r.json())
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
  const olUrl = 'https://openlibrary.org/search.json?title=' + encodeURIComponent(title);
  fetch(olUrl)
    .then(r => r.json())
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
        localStorage.setItem('bookData_' + title, JSON.stringify(bookData));
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
 * CLEAN TITLE FROM FILENAME
 *********************************************/
function cleanTitle(filename) {
  return filename.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ').trim();
}

/*********************************************
 * CREATE BOOK ELEMENT
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
  // Click => open reader
  bookElement.addEventListener('click', () => {
    window.location.href = `reader.html?bookName=${encodeURIComponent(book.name)}&download_url=${encodeURIComponent(book.download_url)}`;
  });
  return bookElement;
}

/*********************************************
 * HOME PAGE LOGIC
 *********************************************/
function loadHomePage() {
  // Show user-specific "Continue Reading"
  const currentReads = getUserList('currentReads');
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

  fetchBooksList(books => {
    // "Your Next Read" => first 5
    const nextContainer = document.getElementById('next-read-container');
    if (nextContainer) {
      books.slice(0, 5).forEach(book => {
        const title = cleanTitle(book.name);
        fetchBookData(title, data => {
          const elem = createBookElement(book, title, data);
          nextContainer.appendChild(elem);
        });
      });
    }
    // "Top Picks" => next 5
    const topPicksContainer = document.getElementById('top-picks-container');
    if (topPicksContainer) {
      books.slice(5, 10).forEach(book => {
        const title = cleanTitle(book.name);
        fetchBookData(title, data => {
          const elem = createBookElement(book, title, data);
          topPicksContainer.appendChild(elem);
        });
      });
    }
    // "Fantasy" => filter by categories
    const fantasyContainer = document.getElementById('fantasy-container');
    if (fantasyContainer) {
      books.forEach(book => {
        const title = cleanTitle(book.name);
        fetchBookData(title, data => {
          const categoriesLower = data.categories.map(c => c.toLowerCase());
          if (categoriesLower.includes('fantasy')) {
            const elem = createBookElement(book, title, data);
            fantasyContainer.appendChild(elem);
          }
        });
      });
    }
  });
}

/*********************************************
 * LIBRARY PAGE LOGIC (With Search)
 *********************************************/
function loadLibraryPage() {
  const librarySection = document.getElementById('library-container');
  const searchBar = document.getElementById('searchBar');
  if (!librarySection || !searchBar) return;

  let allBooks = [];

  fetchBooksList(books => {
    allBooks = books; // store them for search
    displayLibraryBooks(books);
  });

  function displayLibraryBooks(bookArray) {
    librarySection.innerHTML = '';
    bookArray.forEach(book => {
      const title = cleanTitle(book.name);
      fetchBookData(title, data => {
        const elem = createBookElement(book, title, data);
        librarySection.appendChild(elem);
      });
    });
  }

  // Live search
  searchBar.addEventListener('input', () => {
    const query = searchBar.value.toLowerCase();
    const filtered = allBooks.filter(b => cleanTitle(b.name).toLowerCase().includes(query));
    displayLibraryBooks(filtered);
  });
}

/*********************************************
 * DASHBOARD PAGE LOGIC (TBR & Liked - user-specific)
 *********************************************/
function loadDashboardPage() {
  const tbrSection = document.getElementById('tbr-container');
  const likedSection = document.getElementById('liked-container');
  const tbrList = getUserList('tbr');
  const likedList = getUserList('liked');

  // TBR
  if (tbrSection) {
    tbrList.forEach(item => {
      fetchBookData(item.title, data => {
        const fakeBook = { name: item.name, download_url: item.download_url };
        const elem = createBookElement(fakeBook, item.title, data);
        tbrSection.appendChild(elem);
      });
    });
  }

  // Liked
  if (likedSection) {
    likedList.forEach(item => {
      fetchBookData(item.title, data => {
        const fakeBook = { name: item.name, download_url: item.download_url };
        const elem = createBookElement(fakeBook, item.title, data);
        likedSection.appendChild(elem);
      });
    });
  }
}

/*********************************************
 * READER PAGE LOGIC (Advanced PDF Reader)
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
    console.error("Missing bookName or downloadUrl");
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
    // Restore reading progress
    const currentReads = getUserList('currentReads');
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
    let currentReads = getUserList('currentReads');
    let existing = currentReads.find(item => item.name === bookName);
    if (existing) {
      existing.page = currentPage;
    } else {
      existing = { name: bookName, title: cleanTitle(bookName), download_url: downloadUrl, page: currentPage };
      currentReads.push(existing);
    }
    setUserList('currentReads', currentReads);
  }

  // Navigation
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

  // Bookmark => add to user "liked" list
  bookmarkBtn.addEventListener('click', () => {
    const likedList = getUserList('liked');
    if (!likedList.find(item => item.name === bookName)) {
      likedList.push({ name: bookName, title: cleanTitle(bookName), download_url: downloadUrl });
      setUserList('liked', likedList);
      alert(`Book "${cleanTitle(bookName)}" bookmarked!`);
    } else {
      alert("Already bookmarked.");
    }
  });

  // Fullscreen
  fullscreenBtn.addEventListener('click', () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    } else {
      alert("Fullscreen not supported.");
    }
  });
}

/*********************************************
 * PAGE ROUTER
 *********************************************/
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  if (path.includes('home.html')) {
    loadHomePage();
  } else if (path.includes('library.html')) {
    loadLibraryPage();
  } else if (path.includes('dashboard.html')) {
    loadDashboardPage();
  } else if (path.includes('reader.html')) {
    loadReaderPage();
  }
});
