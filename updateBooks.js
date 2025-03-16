// updateBooks.js
const fs = require('fs');
const path = require('path');

// Define the folder containing PDFs.
const booksDir = path.join(__dirname, 'books');

// Read all files from the "books" folder and filter PDF files.
const allFiles = fs.readdirSync(booksDir);
const pdfFiles = allFiles.filter(file => file.toLowerCase().endsWith('.pdf'));

// Create JSON structure.
const booksJson = { books: pdfFiles };

// Write the JSON data to books.json.
fs.writeFileSync(path.join(__dirname, 'books.json'), JSON.stringify(booksJson, null, 2), 'utf-8');

console.log(`Updated books.json with ${pdfFiles.length} PDF(s).`);

