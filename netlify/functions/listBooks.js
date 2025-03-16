// netlify/functions/listBooks.js

const fs = require('fs');
const path = require('path');

// This function will list all PDF files in your "books" folder.
// Since your function is in netlify/functions, we need to step up two levels to reach the repository root.
const booksDir = path.join(__dirname, '..', '..', 'books');

exports.handler = async (event, context) => {
  try {
    // Read all files in the "books" folder
    const files = fs.readdirSync(booksDir);
    // Filter only PDF files (case-insensitive)
    const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));
    
    // Return JSON response with proper headers (including CORS)
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' // Adjust as needed
      },
      body: JSON.stringify({ books: pdfFiles })
    };
  } catch (error) {
    console.error("Error reading books folder:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error reading books folder", details: error.message })
    };
  }
};
