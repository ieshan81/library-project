const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  try {
    // Replace these with your GitHub details
    const repoOwner = "ieshan81";       // Your GitHub username
    const repoName = "books-repo";        // The repository that holds your PDFs
    const folderPath = "pdfs";            // The folder within that repo where PDFs are stored

    const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${folderPath}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Filter for only PDF files and map to get the file name and download URL
    const books = data
      .filter(file => file.name.toLowerCase().endsWith('.pdf'))
      .map(file => ({
        name: file.name,
        download_url: file.download_url
      }));
      
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ books }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: "Unexpected error", details: err.message }),
    };
  }
};
