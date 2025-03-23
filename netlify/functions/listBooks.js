const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://mwizadapnvzxgelyxhvb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13aXphZGFwbnZ6eGdlbHl4aHZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1OTAzNjksImV4cCI6MjA1ODE2NjM2OX0.XEKmvNtbYpxCWGdWT1n9GDIVGp8qqUnz8hFK9sRq_z0";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

exports.handler = async (event, context) => {
  try {
    // Temporarily list all objects in the bucket for debugging:
    const { data, error } = await supabase.storage.from('books').list('', { limit: 100 });
    console.log("All bucket data:", data, error);
    // Return the full list as JSON for inspection:
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ books: data }),
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
