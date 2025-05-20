// Example Node.js backend proxy service
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();
const port = process.env.PORT || 3000;

// API key stored securely as environment variable
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.use(cors());
app.use(express.json());

app.post('/api/define', async (req, res) => {
  try {
    const { word, context } = req.body;
    
    // Rate limiting & authentication could be added here
    // You could implement user-specific API keys or OAuth
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Give me a clear, concise dictionary definition of "${word}" that fits this context: "${context.surroundingText}"`
            }]
          }]
        })
      }
    );
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Proxy server running on port ${port}`);
});