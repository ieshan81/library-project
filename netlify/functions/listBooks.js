// netlify/functions/listBooks.js

const { createClient } = require('@supabase/supabase-js');

// Supabase credentials (same as in script.js)
const SUPABASE_URL = "https://mwizadapnvzxgelyxhvb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13aXphZGFwbnZ6eGdlbHl4aHZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1OTAzNjksImV4cCI6MjA1ODE2NjM2OX0.XEKmvNtbYpxCWGdWT1n9GDIVGp8qqUnz8hFK9sRq_z0";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

exports.handler = async (event, context) => {
  try {
    // List all files in the 'pdfs' folder of the 'books' bucket
    const { data, error } = await supabase.storage.from('books').list('pdfs');
    
    if (error) {
      console.error("Error listing files from Supabase:", error);
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
        body: JSON.stringify({ error: "Failed to list books", details: error.message }),
      };
    }

    // Filter for PDF files and extract their names
    const pdfFiles = data
      .filter(file => file.name.toLowerCase().endsWith('.pdf'))
      .map(file => file.name);

    // Return the list of PDF files
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({ books: pdfFiles }),
    };
  } catch (err) {
    console.error("Unexpected error in listBooks function:", err);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({ error: "Unexpected error", details: err.message }),
    };
  }
};
