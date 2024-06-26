const express = require('express');
const fetch = (...args) => import('node-fetch').then(module => module.default(...args));
const router = express.Router();

router.post('/tts', async (req, res) => {
  const { text, language, speakerWav } = req.body;

  try {
    const response = await fetch('http://localhost:5000/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language, speakerWav })
    });

    if (!response.ok) {
      throw new Error('Error generating speech from text');
    }

    const audioBuffer = await response.buffer();
    res.set('Content-Type', 'audio/wav');
    res.send(audioBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error generating speech from text');
  }
});

module.exports = router;
