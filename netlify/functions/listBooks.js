import { createClient } from '@supabase/supabase-js';

// Supabase credentials
const SUPABASE_URL = 'https://mwizadapnvzxgelyxhvb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13aXphZGFwbnZ6eGdlbHl4aHZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1OTAzNjksImV4cCI6MjA1ODE2NjM2OX0.XEKmvNtbYpxCWGdWT1n9GDIVGp8qqUnz8hFK9sRq_z0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

exports.handler = async () => {
  try {
    // Fetch list of books from the Supabase storage bucket
    const { data, error } = await supabase.storage.from('books').list();

    if (error) {
      console.error("Error fetching books from Supabase:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Error fetching books from Supabase" })
      };
    }

    // Generate public URLs for the books
    const books = data.map(book => ({
      name: book.name,
      url: `${SUPABASE_URL}/storage/v1/object/public/books/${book.name}`
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ books })
    };

  } catch (error) {
    console.error("Unexpected error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Unexpected error fetching books" })
    };
  }
};
