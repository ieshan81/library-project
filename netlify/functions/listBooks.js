const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://mwizadapnvzxgelyxhvb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13aXphZGFwbnZ6eGdlbHl4aHZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1OTAzNjksImV4cCI6MjA1ODE2NjM2OX0.XEKmvNtbYpxCWGdWT1n9GDIVGp8qqUnz8hFK9sRq_z0";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

exports.handler = async (event, context) => {
  try {
    const { data, error } = await supabase.storage.from('books').list('pdfs');
    if (error) {
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
    const pdfFiles = data
      .filter(file => file.name.toLowerCase().endsWith('.pdf'))
      .map(file => file.name);
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
