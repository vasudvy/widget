/**
 * Napier Widget Script
 * This script can be embedded in any website to add voice assistant functionality
 * using Elevenlabs, Gemini, and MCP.
 */
(function() {
  // Configuration
  const BACKEND_URL = 'http://localhost:3000'; // Change to your deployed backend URL when ready

  // Create widget element
  function createWidget() {
    const widgetContainer = document.createElement('div');
    widgetContainer.id = 'napier-widget-container';
    widgetContainer.style.position = 'fixed';
    widgetContainer.style.bottom = '20px';
    widgetContainer.style.right = '20px';
    widgetContainer.style.zIndex = '9999';
    
    // Main button
    const widgetButton = document.createElement('div');
    widgetButton.id = 'napier-widget-button';
    widgetButton.style.width = '60px';
    widgetButton.style.height = '60px';
    widgetButton.style.borderRadius = '50%';
    widgetButton.style.backgroundColor = '#007BFF';
    widgetButton.style.display = 'flex';
    widgetButton.style.justifyContent = 'center';
    widgetButton.style.alignItems = 'center';
    widgetButton.style.cursor = 'pointer';
    widgetButton.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    
    // Mic icon
    widgetButton.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
      <line x1="12" y1="19" x2="12" y2="23"></line>
      <line x1="8" y1="23" x2="16" y2="23"></line>
    </svg>`;
    
    // Add status indicator
    const statusIndicator = document.createElement('div');
    statusIndicator.id = 'napier-status';
    statusIndicator.style.position = 'absolute';
    statusIndicator.style.bottom = '-25px';
    statusIndicator.style.left = '0';
    statusIndicator.style.right = '0';
    statusIndicator.style.textAlign = 'center';
    statusIndicator.style.fontSize = '12px';
    statusIndicator.style.color = '#333';
    statusIndicator.style.fontFamily = 'Arial, sans-serif';
    statusIndicator.textContent = 'Napier ready';
    
    widgetContainer.appendChild(widgetButton);
    widgetContainer.appendChild(statusIndicator);
    document.body.appendChild(widgetContainer);
    
    return {
      container: widgetContainer,
      button: widgetButton,
      status: statusIndicator
    };
  }

  // Handle speech recognition
  function setupSpeechRecognition() {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
      console.error('Speech recognition not supported in this browser');
      return null;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    return recognition;
  }

  // Capture page content for context
  function getPageContext() {
    // This is a simple implementation - you might want to be more selective
    // about what content you capture
    const pageTitle = document.title;
    const pageUrl = window.location.href;
    
    // Get visible text from key elements
    const headings = Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent).join(' | ');
    const mainContent = document.querySelector('main')?.textContent || '';
    const bodyText = document.body.textContent.substring(0, 1000); // Limit to avoid large payloads
    
    return {
      title: pageTitle,
      url: pageUrl,
      content: `${headings} ${mainContent.substring(0, 500)} ${bodyText.substring(0, 500)}`
    };
  }

  // Initialize the widget
  function init() {
    // Create and add widget to the page
    const widget = createWidget();
    const recognition = setupSpeechRecognition();
    let isListening = false;
    let audioElement = null;
    
    // If speech recognition isn't supported, update the widget accordingly
    if (!recognition) {
      widget.status.textContent = 'Voice input not supported in this browser';
      widget.status.style.color = '#d9534f';
    }
    
    // Handle click on the widget button
    widget.button.addEventListener('click', () => {
      if (!recognition) {
        sendTextInput(prompt('Type your question:'));
        return;
      }
      
      if (isListening) {
        // Stop listening
        recognition.stop();
      } else {
        // Start listening
        startListening();
      }
    });
    
    // Start listening for voice input
    function startListening() {
      if (audioElement) {
        audioElement.pause();
        audioElement = null;
      }
      
      isListening = true;
      widget.status.textContent = 'Listening...';
      widget.button.style.backgroundColor = '#dc3545'; // Red when listening
      recognition.start();
    }
    
    // Handle recognized speech
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      widget.status.textContent = `Processing: "${transcript}"`;
      sendTextInput(transcript);
    };
    
    // Handle speech recognition end
    recognition.onend = () => {
      isListening = false;
      widget.button.style.backgroundColor = '#007BFF'; // Back to blue
    };
    
    // Handle speech recognition errors
    recognition.onerror = (event) => {
      console.error('Recognition error:', event.error);
      widget.status.textContent = 'Error: ' + event.error;
      isListening = false;
      widget.button.style.backgroundColor = '#007BFF';
    };
    
    // Send text input to the backend
    function sendTextInput(text) {
      if (!text || text.trim() === '') {
        widget.status.textContent = 'Napier ready';
        return;
      }
      
      widget.status.textContent = 'Processing...';
      
      // Get page context
      const pageContext = getPageContext();
      
      // Send to backend
      fetch(`${BACKEND_URL}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: text,
          pageUrl: pageContext.url,
          pageContent: pageContext.content,
          clientKey: 'local-development' // Replace with actual client key in production
        })
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        handleResponse(data);
      })
      .catch(error => {
        console.error('Error communicating with Napier backend:', error);
        widget.status.textContent = 'Connection error. Try again.';
      });
    }
    
    // Handle response from the backend
    function handleResponse(response) {
      if (response.text) {
        widget.status.textContent = 'Napier: ' + response.text.substring(0, 30) + '...';
        
        // Play audio if available
        if (response.audioUrl) {
          audioElement = new Audio(response.audioUrl);
          audioElement.play();
          
          audioElement.onended = () => {
            widget.status.textContent = 'Napier ready';
          };
        } else {
          widget.status.textContent = 'Napier ready';
        }
      } else {
        widget.status.textContent = 'No response received';
      }
    }
  }

  // Initialize when DOM is fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();