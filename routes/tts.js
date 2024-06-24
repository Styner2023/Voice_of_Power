// Import the required modules
const express = require('express');
const fetch = (...args) => import('node-fetch').then(module => module.default(...args));

// Create an instance of the express.Router() class
const router = express.Router();

// Define a POST route '/tts' that accepts a JSON payload containing 'text', 'language', and 'speakerWav'
router.post('/tts', async (req, res) => {
  const { text, language, speakerWav } = req.body;

  try {
    // Use fetch to send a POST request to the http://localhost:5000/tts endpoint with the provided data
    const response = await fetch('http://localhost:5000/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language, speakerWav })
    });

    // If the response is not OK (status code outside the 200-299 range), throw an error
    if (!response.ok) {
      throw new Error('Error generating speech from text');
    }

    // If the response is OK, retrieve the audio buffer from the response and set the Content-Type header to 'audio/wav'
    const audioBuffer = await response.buffer();
    res.set('Content-Type', 'audio/wav');

    // Send the audio buffer as the response to the client
    res.send(audioBuffer);
  } catch (error) {
    // If there's an error during the process, log the error and send a 500 Internal Server Error response to the client
    console.error(error);
    res.status(500).send('Error generating speech from text');
  }
});

// Export the router to be used in other parts of the application
module.exports = router;
