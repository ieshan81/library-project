/*********************************************
 * LOGIN & LOGOUT EVENT LISTENERS
 *********************************************/
document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) {
    loginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      // In this demo any email/password works; redirect to home page.
      window.location.href = 'home.html';
    });
  }
  
  const logoutBtns = document.querySelectorAll('#logoutBtn');
  logoutBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      // Clear any stored user data if needed and redirect to login.
      window.location.href = 'index.html';
    });
  });
});

/*********************************************
 * 1) SUPABASE SETUP
 *********************************************/
const { createClient } = supabase;
const SUPABASE_URL = "https://mwizadapnvzxgelyxhvb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13aXphZGFwbnZ6eGdlbHl4aHZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1OTAzNjksImV4cCI6MjA1ODE2NjM2OX0.XEKmvNtbYpxCWGdWT1n9GDIVGp8qqUnz8hFK9sRq_z0";
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log("Supabase initialized!");

/*********************************************
 * 2) FETCH BOOKS FROM NETLIFY FUNCTION
 *********************************************/
function fetchBooksList(callback) {
  const functionURL = 'https://library-project-app.netlify.app/.netlify/functions/listBooks';
  fetch(functionURL)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log("Netlify function response:", data);
      if (data.books) {
        callback(data.books);
      } else {
        console.warn("No books found in Supabase response:", data);
        callback([]);
      }
    })
    .catch(err => {
      console.error("Error fetching book list from Netlify function:", err);
      callback([]);
    });
}

/*********************************************
 * 3) FETCH BOOK METADATA FROM GOOGLE BOOKS
 *********************************************/
function fetchBookData(title, callback) {
  const cacheKey = `bookData_${title}`;
  const cachedData = localStorage.getItem(cacheKey);
  if (cachedData) {
    callback(JSON.parse(cachedData));
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
          img.onerror = () => {
            console.warn(`Failed to load cover for ${title} from Google Books, falling back to Open Library`);
            fetchOpenLibrary(title, callback);
          };
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

/*********************************************
 * 4) FETCH BOOK METADATA FROM OPEN LIBRARY
 *********************************************/
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
 * 5) CREATE BOOK ELEMENT WITH HOVER EFFECT
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
    window.location.href = `reader.html?book=${encodeURIComponent(book)}`;
  });
  return bookElement;
}

/*********************************************
 * 6) HOME PAGE LOGIC (home.html)
 *********************************************/
function loadHomePage() {
  fetchBooksList(books => {
    if (books.length === 0) {
      console.log("No books found in Supabase...");
      return;
    }

    // Continue Reading Section
    const currentReads = JSON.parse(localStorage.getItem('currentReads')) || [];
    const continueReadingSection = document.getElementById('continue-reading-container');
    if (continueReadingSection) {
      if (currentReads.length > 0) {
        currentReads.forEach(book => {
          const title = book.title.replace(/_/g, ' ').replace(/-/g, ' ').split('.pdf')[0];
          fetchBookData(title, data => {
            const bookElement = createBookElement(book.title, title, data);
            continueReadingSection.appendChild(bookElement);
          });
        });
      } else {
        continueReadingSection.innerHTML = '<p>No books in progress.</p>';
      }
    }

    // Your Next Read Section
    const nextReadSection = document.getElementById('next-read-container');
    if (nextReadSection) {
      books.slice(0, 5).forEach(book => {
        const title = book.replace(/_/g, ' ').replace(/-/g, ' ').split('.pdf')[0];
        fetchBookData(title, data => {
          const bookElement = createBookElement(book, title, data);
          nextReadSection.appendChild(bookElement);
        });
      });
    }

    // Top Picks Section
    const topPicksSection = document.getElementById('top-picks-container');
    if (topPicksSection) {
      books.slice(0, 5).forEach(book => {
        const title = book.replace(/_/g, ' ').replace(/-/g, ' ').split('.pdf')[0];
        fetchBookData(title, data => {
          const bookElement = createBookElement(book, title, data);
          topPicksSection.appendChild(bookElement);
        });
      });
    }

    // Fantasy Section
    const fantasySection = document.getElementById('fantasy-container');
    if (fantasySection) {
      books.slice(0, 5).forEach(book => {
        const title = book.replace(/_/g, ' ').replace(/-/g, ' ').split('.pdf')[0];
        fetchBookData(title, data => {
          if (data.categories.includes('Fantasy')) {
            const bookElement = createBookElement(book, title, data);
            fantasySection.appendChild(bookElement);
          }
        });
      });
    }
  });
}

/*********************************************
 * 7) LIBRARY PAGE LOGIC (library.html)
 *********************************************/
function loadLibraryPage() {
  fetchBooksList(books => {
    if (books.length === 0) {
      console.log("No books found in Supabase...");
      return;
    }

    const librarySection = document.getElementById('library-container');
    if (librarySection) {
      books.forEach(book => {
        const title = book.replace(/_/g, ' ').replace(/-/g, ' ').split('.pdf')[0];
        fetchBookData(title, data => {
          const bookElement = createBookElement(book, title, data);
          librarySection.appendChild(bookElement);
        });
      });
    }
  });
}

/*********************************************
 * 8) DASHBOARD PAGE LOGIC (dashboard.html)
 *********************************************/
function loadDashboardPage() {
  fetchBooksList(books => {
    if (books.length === 0) {
      console.log("No books found in Supabase...");
      return;
    }

    // To Be Read (TBR) Section
    const tbrSection = document.getElementById('tbr-container');
    if (tbrSection) {
      books.slice(0, 5).forEach(book => {
        const title = book.replace(/_/g, ' ').replace(/-/g, ' ').split('.pdf')[0];
        fetchBookData(title, data => {
          const bookElement = createBookElement(book, title, data);
          tbrSection.appendChild(bookElement);
        });
      });
    }

    // Liked Books Section
    const likedSection = document.getElementById('liked-container');
    if (likedSection) {
      books.slice(-5).forEach(book => {
        const title = book.replace(/_/g, ' ').replace(/-/g, ' ').split('.pdf')[0];
        fetchBookData(title, data => {
          const bookElement = createBookElement(book, title, data);
          likedSection.appendChild(bookElement);
        });
      });
    }
  });
}

/*********************************************
 * 9) READER PAGE LOGIC (PDF.js with Supabase URL)
 *********************************************/
function loadReaderPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const book = urlParams.get('book');
  if (!book) {
    console.error("No book specified in URL");
    return;
  }

  const pdfViewer = document.getElementById('pdf-viewer');
  if (pdfViewer) {
    const { data } = supabaseClient.storage.from('books').getPublicUrl(`pdfs${book}`);
    const pdfUrl = data.publicUrl;

    pdfjsLib.getDocument(pdfUrl).promise.then(pdf => {
      pdfViewer.innerHTML = '';
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        pdf.getPage(pageNum).then(page => {
          const canvas = document.createElement('canvas');
          pdfViewer.appendChild(canvas);
          const context = canvas.getContext('2d');
          const viewport = page.getViewport({ scale: 1.0 });
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          page.render({
            canvasContext: context,
            viewport: viewport
          });

          // Save reading progress
          const currentReads = JSON.parse(localStorage.getItem('currentReads')) || [];
          const existingBook = currentReads.find(b => b.title === book);
          if (existingBook) {
            existingBook.page = pageNum;
          } else {
            currentReads.push({ title: book, page: pageNum });
          }
          localStorage.setItem('currentReads', JSON.stringify(currentReads));
        });
      }
    }).catch(err => {
      console.error("Error loading PDF:", err);
    });
  }
}

/*********************************************
 * 10) PAGE LOAD LOGIC
 *********************************************/
document.addEventListener('DOMContentLoaded', () => {
  console.log("Script.js is loading properly!");
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
