const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const { MCPClient } = require('mcp-client');
require('dotenv').config();

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Environment variables (make sure these are in your .env file)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY;
const ELEVEN_LABS_VOICE_ID = process.env.ELEVEN_LABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB'; // Default voice ID

// Initialize Gemini
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: 'gemini-pro' });

// Initialize MCP Client
const mcpClient = new MCPClient({
  endpoint: 'http://localhost:8931'
});

// Elevenlabs TTS endpoint
const ELEVEN_LABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

// Root route
app.get('/', (req, res) => {
  res.send('Napier backend is running!');
});

// Handle user input via POST
app.post('/query', async (req, res) => {
  try {
    const { input, clientKey, pageUrl, pageContent } = req.body;

    if (!input) {
      return res.status(400).json({ error: 'Missing input' });
    }

    console.log(`Received query: "${input}" for URL: ${pageUrl}`);
    
    // Connect to MCP and get browser context
    const mcpSession = await mcpClient.newSession();
    
    let browserContext;
    try {
      browserContext = await mcpSession.newContext();
      
      // If a page URL is provided, navigate to it
      if (pageUrl) {
        const page = await browserContext.newPage();
        await page.goto(pageUrl);
        console.log(`Navigated to: ${pageUrl}`);
      }
    } catch (err) {
      console.error('Failed to create browser context:', err);
      return res.status(500).json({ error: 'Failed to create browser context' });
    }

    // Prepare prompt for Gemini
    const prompt = `
    You are Napier, an intelligent voice concierge for e-commerce websites. 
    You help users find products and navigate websites through natural conversation.
    
    Current webpage: ${pageUrl || 'Unknown'}
    Page content summary: ${pageContent || 'Not provided'}
    
    User query: "${input}"
    
    Respond to the user's query in a helpful, conversational way. 
    If needed, suggest actions that could be performed on the webpage (like clicking buttons, scrolling, etc.).
    Keep your response concise and friendly.
    `;

    // Get response from Gemini
    const result = await geminiModel.generateContent(prompt);
    const response = result.response.text();
    console.log('Gemini response:', response);

    // Generate speech with Elevenlabs
    let audioUrl = null;
    try {
      audioUrl = await generateSpeech(response);
      console.log('Generated audio URL:', audioUrl);
    } catch (err) {
      console.error('TTS error:', err);
    }

    // Perform any necessary browser actions based on AI response
    // This is a placeholder - you would need to parse the AI response
    // and extract actions to be performed
    try {
      if (browserContext) {
        // Example: if response contains "click the search button", we could:
        // const page = browserContext.pages()[0];
        // await page.click('button.search');
        
        // Close browser context when done
        await browserContext.close();
      }
    } catch (err) {
      console.error('Browser action error:', err);
    }

    // Send response back to client
    res.json({
      text: response,
      audioUrl: audioUrl,
    });
    
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Elevenlabs TTS function
async function generateSpeech(text) {
  try {
    const response = await axios.post(
      ELEVEN_LABS_API_URL + '/' + ELEVEN_LABS_VOICE_ID,
      {
        text: text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      },
      {
        headers: {
          'xi-api-key': ELEVEN_LABS_API_KEY,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      }
    );

    // Convert the audio data to base64
    const base64Audio = Buffer.from(response.data).toString('base64');
    return `data:audio/mpeg;base64,${base64Audio}`;
  } catch (error) {
    console.error('Elevenlabs API error:', error.response?.data || error.message);
    throw new Error('Failed to generate speech');
  }
}

// Start server
app.listen(port, () => {
  console.log(`🚀 Napier backend listening at http://localhost:${port}`);
});