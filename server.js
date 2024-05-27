require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
const bodyParser = require('body-parser');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const path = require('path');
const User = require('./models/user'); // Ensure User model is imported

const app = express();
const port = process.env.PORT || 3000;

// Logging environment variables for debugging
console.log("MONGO_URI from .env: ", process.env.MONGO_URI);
console.log("JWT_SECRET from .env: ", process.env.JWT_SECRET);

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log('MongoDB connection error:', err));

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(session({ secret: process.env.JWT_SECRET, resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

// Passport configuration
passport.use(new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
    User.findOne({ email: email }, (err, user) => {
        if (err) return done(err);
        if (!user) return done(null, false, { message: 'Incorrect email.' });
        bcrypt.compare(password, user.password, (err, res) => {
            if (res) return done(null, user);
            else return done(null, false, { message: 'Incorrect password.' });
        });
    });
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => {
        done(err, user);
    });
});

// Routes
const uploadRoute = require('./routes/upload');
const ttsRoute = require('./routes/tts'); // Include the TTS route

app.use('/upload', uploadRoute);
app.use('/tts', ttsRoute); // Use the TTS route

app.get('/', (req, res) => {
    res.send('Welcome to the Voice of Power application!');
});

app.post('/register', (req, res) => {
    const { name, email, password } = req.body;
    bcrypt.hash(password, 10, (err, hash) => {
        if (err) return res.status(500).send('Error registering new user.');
        const newUser = new User({ name, email, password: hash });
        newUser.save(err => {
            if (err) res.status(500).send('Error registering new user.');
            else res.status(200).send('User registered.');
        });
    });
});

app.post('/login', passport.authenticate('local', { successRedirect: '/dashboard', failureRedirect: '/' }));

app.get('/dashboard', (req, res) => {
    if (req.isAuthenticated()) {
        User.findById(req.user._id).populate('books').exec((err, user) => {
            if (err) res.status(500).send('Error fetching user data.');
            else res.status(200).json(user.books);
        });
    } else {
        res.status(401).send('Not authenticated.');
    }
});

app.get("/download/:id", (req, res) => {
    Book.findById(req.params.id, (err, book) => {
        if (err) return res.status(500).send("Error finding book.");
        if (!book) return res.status(404).send("Book not found.");
        if (book.user.toString() !== req.user._id.toString())
            return res.status(403).send("Not authorized to access this book.");
        res.download(book.path, book.originalname);
    });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
