const express = require('express');
const AWS = require('aws-sdk');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
const bodyParser = require('body-parser');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const path = require('path');
const dotenv = require('dotenv');
const User = require('./models/user'); // Ensure this path is correct
const Book = require('./models/book'); // Ensure this path is correct
const { getFileFromS3 } = require('./s3-functions'); // Import the function to fetch files from S3
const uploadRoute = require('./routes/upload'); // Ensure this path is correct
const ttsRoute = require('./routes/tts'); // Ensure this path is correct
const authRoute = require('./routes/auth'); // Ensure this path is correct

const app = express();
const port = process.env.PORT || 3000;

// Configure AWS SDK
const secretsManager = new AWS.SecretsManager({ region: 'us-west-1' });

async function getSecret() {
  try {
    const data = await secretsManager.getSecretValue({ SecretId: 'voice-of-power-env' }).promise();
    if (data.SecretString) {
      const secrets = JSON.parse(data.SecretString);
      process.env.DB_HOST = secrets.DB_HOST;
      process.env.DB_USER = secrets.DB_USER;
      process.env.DB_PASS = secrets.DB_PASS;
      process.env.MONGO_URI = secrets.MONGO_URI;
      process.env.JWT_SECRET = secrets.JWT_SECRET;
      console.log('Secrets loaded successfully');
    }
  } catch (err) {
    console.error('Error retrieving secret:', err);
  }
}

// Call the function to get secrets before starting the server
getSecret().then(() => {
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

  // Example usage of S3 getFileFromS3 within an async function to log or handle the file data
  (async () => {
    try {
      const fileData = await getFileFromS3('checkpoints_v1/base_speakers/EN/checkpoint.pth');
      console.log('File data:', fileData);
    } catch (error) {
      console.error('Error:', error);
    }
  })();

  // Routes
  app.use('/upload', uploadRoute);
  app.use('/tts', ttsRoute); // Use the TTS route
  app.use('/auth', authRoute); // Use the Auth route

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
    console.log(`Server is running on port ${port}`);
  });
});
