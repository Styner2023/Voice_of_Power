const mongoose = require('mongoose');

const BookSchema = new mongoose.Schema({
    filename: String,
    originalname: String,
    path: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('Book', BookSchema);
