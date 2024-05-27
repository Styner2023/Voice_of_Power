const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();

// Configure multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
    }
});

const upload = multer({ storage: storage });

// Route for uploading PDFs
router.post('/upload', upload.single('pdf'), (req, res) => {
    res.send('File uploaded successfully');
});

module.exports = router;

