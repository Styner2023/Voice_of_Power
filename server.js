const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
const bodyParser = require('body-parser');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

// User model
const UserSchema = new mongoose.Schema({
    username: String,
    password: String,
    books: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Book' }]
});

const User = mongoose.model('User', UserSchema);

// Book model
const BookSchema = new mongoose.Schema({
    filename: String,
    originalname: String,
    path: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const Book = mongoose.model('Book', BookSchema);

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(session({ secret: 'secret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

// Passport configuration
passport.use(new LocalStrategy((username, password, done) => {
    User.findOne({ username: username }, (err, user) => {
        if (err) return done(err);
        if (!user) return done(null, false, { message: 'Incorrect username.' });
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

// File upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Routes
app.get('/', (req, res) => {
    res.send('Welcome to the Voice of Power application!');
});

app.post('/register', (req, res) => {
    const { username, password } = req.body;
    bcrypt.hash(password, 10, (err, hash) => {
        if (err) return res.status(500).send('Error registering new user.');
        const newUser = new User({ username: username, password: hash });
        newUser.save(err => {
            if (err) res.status(500).send('Error registering new user.');
            else res.status(200).send('User registered.');
        });
    });
});

app.post('/login', passport.authenticate('local', { successRedirect: '/dashboard', failureRedirect: '/' }));

app.post('/upload', upload.single('book'), (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).send('Not authenticated.');
    }
    const newBook = new Book({
        filename: req.file.filename,
        originalname: req.file.originalname,
        path: req.file.path,
        user: req.user._id
    });
    newBook.save(err => {
        if (err) res.status(500).send('Error uploading book.');
        else {
            User.findByIdAndUpdate(req.user._id, { $push: { books: newBook._id } }, err => {
                if (err) res.status(500).send('Error updating user.');
                else res.status(200).send('Book uploaded.');
            });
        }
    });
});

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

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
