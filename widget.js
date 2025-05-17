(function () {
  // Dynamically creating the widget
  const widget = document.createElement('div');
  widget.id = 'napier-widget';
  widget.style.position = 'fixed';
  widget.style.bottom = '20px';
  widget.style.right = '20px';
  widget.style.zIndex = '9999';
  widget.style.backgroundColor = '#007BFF';
  widget.style.color = '#fff';
  widget.style.padding = '10px 20px';
  widget.style.borderRadius = '50px';
  widget.style.cursor = 'pointer';
  widget.innerHTML = 'Talk to Napier';

  document.body.appendChild(widget);

  widget.addEventListener('click', () => {
    openVoiceInteraction();
  });

  function openVoiceInteraction() {
    // For now, just send a sample message
    fetchServerResponse('Hello, I need help!');
  }

  // Send user input to the backend (MCP server)
  function fetchServerResponse(inputText) {
    const clientKey = 'user-client-key'; // You may need to dynamically fetch this

    fetch('http://localhost:3000/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: inputText, clientKey: clientKey })
    })
    .then(response => response.json())
    .then(data => handleAgentResponse(data))
    .catch(err => console.error('Error fetching server response:', err));
  }

  // Handle the response (text and audio)
  function handleAgentResponse(response) {
    alert(`Response: ${response.text}`);
    if (response.audioUrl) {
      playAudio(response.audioUrl);
    }
  }

  // Play the audio response
  function playAudio(audioUrl) {
    const audio = new Audio(audioUrl);
    audio.play();
  }
})();
