// Example Node.js backend proxy service
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();
const dotenv = require('dotenv');
dotenv.config();
const port = process.env.PORT || 3000;

// API key stored securely as environment variable
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('ERROR: GEMINI_API_KEY environment variable not set!');
  process.exit(1);
}

app.use(cors());
app.use(express.json());

app.post('/api/define', async (req, res) => {
  try {
    const { word, context } = req.body;
    
    // For testing - handle missing context object
    const surroundingText = context?.surroundingText || context || "No context provided";
    const pageTitle = context?.pageTitle || "No page title";
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Give me a clear, concise dictionary definition of the word "${word}" that specifically fits the following context.
              Focus on the meaning that's most relevant to this context:
              
              Text context: "${surroundingText}"
              
              Page title: "${pageTitle}"
              
              Format your response as a dictionary-style definition without mentioning the context I provided.`
            }]
          }]
        })
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ 
        error: errorData.error?.message || 'Error calling Gemini API' 
      });
    }
  
    // This is the variable you're sending in the response
    const data = await response.json();
    res.json(data); // Make sure you're using 'data', not 'apiResponse'
  
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Dictionary server running on port ${port}`);
});