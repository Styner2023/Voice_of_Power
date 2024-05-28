const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const Book = require('../models/book'); // Correct path
const User = require('../models/user'); // Correct path

const router = express.Router();

// Configure multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Route for uploading PDFs
router.post('/upload', upload.single('pdf'), (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).send('Not authenticated');
    }

    const pdfPath = req.file.path;
    const dataBuffer = fs.readFileSync(pdfPath);

    pdfParse(dataBuffer).then(data => {
        const newBook = new Book({
            filename: req.file.filename,
            originalname: req.file.originalname,
            path: req.file.path,
            user: req.user._id
        });

        newBook.save(err => {
            if (err) return res.status(500).send('Error saving book.');
            res.status(200).json({ text: data.text });
        });
    }).catch(err => {
        res.status(500).send('Error extracting text from PDF');
    });
});

module.exports = router;

