/*********************************************
 * NETLIFY IDENTITY & LOGIN/LOGOUT
 *********************************************/
document.addEventListener('DOMContentLoaded', () => {
  // If the login button is present (on index.html), open the Identity widget
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) {
    loginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.netlifyIdentity) {
        window.netlifyIdentity.open();
      }
    });
  }
  
  // Set up sign-out for any logout buttons
  const logoutBtns = document.querySelectorAll('#logoutBtn');
  logoutBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.netlifyIdentity) {
        window.netlifyIdentity.logout();
      }
      window.location.href = 'index.html';
    });
  });
  
  // Optionally, you can listen for the login event and redirect
  if (window.netlifyIdentity) {
    window.netlifyIdentity.on('login', user => {
      console.log('Logged in as:', user.email);
      // Redirect to home page after login
      window.location.href = 'home.html';
    });
  }
});

/*********************************************
 * BOOKS LISTING LOGIC (Fetching from Netlify Function)
 *********************************************/
function fetchBooksList(callback) {
  // Change this URL if needed; by default Netlify functions are hosted under /.netlify/functions/
  const functionURL = '/.netlify/functions/listBooks';
  fetch(functionURL)
    .then(response => response.json())
    .then(data => {
      console.log("Books fetched:", data);
      if (data.books) {
        callback(data.books);
      } else {
        callback([]);
      }
    })
    .catch(err => {
      console.error("Error fetching books:", err);
      callback([]);
    });
}

/*********************************************
 * CREATE BOOK ELEMENT
 *********************************************/
function createBookElement(book) {
  const bookElement = document.createElement('div');
  bookElement.className = 'book';
  // Use the book object returned from the GitHub API (name and download_url)
  bookElement.innerHTML = `
    <img src="images/placeholder.jpg" alt="${book.name}">
    <h3>${book.name}</h3>
  `;
  // On click, go to reader page with the download URL as a parameter
  bookElement.addEventListener('click', () => {
    window.location.href = `reader.html?download_url=${encodeURIComponent(book.download_url)}`;
  });
  return bookElement;
}

/*********************************************
 * HOME PAGE LOGIC (home.html)
 *********************************************/
function loadHomePage() {
  fetchBooksList(books => {
    const nextReadSection = document.getElementById('next-read-container');
    if (nextReadSection) {
      books.forEach(book => {
        const bookElement = createBookElement(book);
        nextReadSection.appendChild(bookElement);
      });
    }
  });
}

/*********************************************
 * LIBRARY PAGE LOGIC (library.html)
 *********************************************/
function loadLibraryPage() {
  fetchBooksList(books => {
    const librarySection = document.getElementById('library-container');
    if (librarySection) {
      books.forEach(book => {
        const bookElement = createBookElement(book);
        librarySection.appendChild(bookElement);
      });
    }
  });
}

/*********************************************
 * DASHBOARD PAGE LOGIC (dashboard.html)
 *********************************************/
function loadDashboardPage() {
  // For demonstration, we show the same list in dashboard sections.
  fetchBooksList(books => {
    const tbrSection = document.getElementById('tbr-container');
    if (tbrSection) {
      books.forEach(book => {
        const bookElement = createBookElement(book);
        tbrSection.appendChild(bookElement);
      });
    }
    const likedSection = document.getElementById('liked-container');
    if (likedSection) {
      books.forEach(book => {
        const bookElement = createBookElement(book);
        likedSection.appendChild(bookElement);
      });
    }
  });
}

/*********************************************
 * READER PAGE LOGIC (reader.html)
 *********************************************/
function loadReaderPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const downloadUrl = urlParams.get('download_url');
  if (!downloadUrl) {
    console.error("No download URL provided");
    return;
  }
  
  const pdfViewer = document.getElementById('pdf-viewer');
  if (pdfViewer) {
    pdfjsLib.getDocument(downloadUrl).promise.then(pdf => {
      pdfViewer.innerHTML = '';
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        pdf.getPage(pageNum).then(page => {
          const canvas = document.createElement('canvas');
          pdfViewer.appendChild(canvas);
          const context = canvas.getContext('2d');
          const viewport = page.getViewport({ scale: 1.0 });
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          page.render({ canvasContext: context, viewport: viewport });
        });
      }
    }).catch(err => {
      console.error("Error loading PDF:", err);
    });
  }
}

/*********************************************
 * PAGE LOAD LOGIC
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
