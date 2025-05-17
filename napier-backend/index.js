const express = require('express');
const axios = require('axios');
const EventSource = require('eventsource'); // For SSE support
require('dotenv').config();

const app = express();
const port = 3000;

// Middleware
app.use(express.json());

// MCP Server URL (change to deployed endpoint when ready)
const MCP_SERVER_URL = 'http://localhost:8931/sse';

// Eleven Labs API setup (replace with real key)
const ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY;

// Root route
app.get('/', (req, res) => {
  res.send('Napier backend is running!');
});

// Handle user input via POST
app.post('/query', (req, res) => {
  const { input, clientKey } = req.body;

  if (!input || !clientKey) {
    return res.status(400).json({ error: 'Missing input or clientKey' });
  }

  // Connect to MCP server via SSE
  const eventSource = new EventSource(`${MCP_SERVER_URL}?input=${encodeURIComponent(input)}&clientKey=${encodeURIComponent(clientKey)}`);

  let responded = false;

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('🔹 MCP Response:', data);

    if (data.text && !responded) {
      responded = true;
      eventSource.close();

      generateSpeech(data.text)
        .then((audioUrl) => {
          res.json({
            text: data.text,
            audioUrl,
          });
        })
        .catch((err) => {
          console.error('❌ TTS error:', err);
          res.json({ text: data.text, audioUrl: null });
        });
    }
  };

  eventSource.onerror = (err) => {
    console.error('❌ MCP SSE error:', err);
    if (!responded) {
      res.status(500).json({ error: 'MCP server connection failed' });
    }
    eventSource.close();
  };
});

// Eleven Labs TTS
async function generateSpeech(text) {
  const response = await axios.post(
    ELEVEN_LABS_API_URL,
    {
      text,
      voice: 'en_us_male',
    },
    {
      headers: {
        Authorization: `Bearer ${ELEVEN_LABS_API_KEY}`,
      },
    }
  );

  return response.data.audioUrl;
}

// Start server
app.listen(port, () => {
  console.log(`🚀 Napier backend listening at http://localhost:${port}`);
});
