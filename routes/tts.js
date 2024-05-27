const express = require('express');
const router = express.Router();
const OpenVoice = require('../OpenVoice'); // Adjust the path if necessary

const tts = new OpenVoice.TTS({
    model: 'path-to-openvoice-model', // Adjust the model path accordingly
    gpu: true // if you have a GPU available
});

router.post('/tts', async (req, res) => {
    const { text, language, speakerWav } = req.body;
    try {
        const audioBuffer = await tts.synthesize({
            text: text,
            speaker_wav: speakerWav,
            language: language
        });
        res.set('Content-Type', 'audio/wav');
        res.send(audioBuffer);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error generating speech from text');
    }
});

module.exports = router;
