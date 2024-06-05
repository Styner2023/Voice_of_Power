// Load environment variables from .env file for local development
require('dotenv').config();

const AWS = require('aws-sdk');
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const { getFileFromS3, uploadToS3 } = require('./s3-functions');
const uploadRoute = require('./routes/upload');
const ttsRoute = require('./routes/tts');
const authRoute = require('./routes/auth');

if (process.env.NODE_ENV !== 'production') {
    // Only load from .env file if not in production
    require('dotenv').config();
}

// Load parameters from AWS Systems Manager Parameter Store
const ssm = new AWS.SSM();
const params = {
  Names: [
    '/voice-of-power/AWS_REGION',
    '/voice-of-power/AWS_ACCESS_KEY_ID',
    '/voice-of-power/AWS_SECRET_ACCESS_KEY',
    '/voice-of-power/DYNAMODB_USERS_TABLE',
    '/voice-of-power/DYNAMODB_FILES_TABLE',
    '/voice-of-power/S3_BUCKET_NAME',
    '/voice-of-power/JWT_SECRET',
    '/voice-of-power/PORT'
  ],
  WithDecryption: true,
};

ssm.getParameters(params, (err, data) => {
  if (err) {
    console.log('Error fetching SSM parameters:', err);
    process.exit(1);
  } else {
    // Assign parameters to process.env
    data.Parameters.forEach((param) => {
      const name = param.Name.split('/').pop(); // Get the parameter name without the prefix
      process.env[name] = param.Value;
    });

    // Validate if all necessary environment variables are set
    const requiredEnvVars = [
      'AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'DYNAMODB_USERS_TABLE',
      'DYNAMODB_FILES_TABLE', 'S3_BUCKET_NAME', 'JWT_SECRET', 'PORT'
    ];

    for (const varName of requiredEnvVars) {
      if (!process.env[varName]) {
        console.error(`Environment variable ${varName} is not set.`);
        process.exit(1);
      }
    }

    // Start the server after loading parameters
    startServer();
  }
});

function startServer() {
  const app = express();
  const port = process.env.PORT || 3000;

  // AWS configuration
  AWS.config.update({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  });

  const s3 = new AWS.S3();
  const dynamoDb = new AWS.DynamoDB.DocumentClient();

  // Middleware
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());
  app.use(session({ secret: process.env.JWT_SECRET, resave: false, saveUninitialized: false }));
  app.use(passport.initialize());
  app.use(passport.session());

  // Serve static files from the public directory
  app.use(express.static(path.join(__dirname, 'public')));

  // Passport configuration
  passport.use(new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
    const params = {
      TableName: process.env.DYNAMODB_USERS_TABLE,
      Key: { email },
    };

    dynamoDb.get(params, (err, data) => {
      if (err) {
        return done(err);
      }
      const user = data.Item;
      if (!user) {
        return done(null, false, { message: 'Incorrect email.' });
      }

      bcrypt.compare(password, user.password, (err, res) => {
        if (res) {
          return done(null, user);
        }
        return done(null, false, { message: 'Incorrect password.' });
      });
    });
  }));

  passport.serializeUser((user, done) => {
    done(null, user.email);
  });

  passport.deserializeUser((email, done) => {
    const params = {
      TableName: process.env.DYNAMODB_USERS_TABLE,
      Key: { email },
    };

    dynamoDb.get(params, (err, data) => {
      if (err) {
        return done(err);
      }
      done(null, data.Item);
    });
  });

  // File upload to S3 setup
  const upload = multer({ dest: 'uploads/' });

  app.post('/upload', upload.single('file'), (req, res) => {
    const { file } = req;
    const filePath = path.join(__dirname, file.path);
    console.log('File received:', file); // Log file details

    // Read file content
    const fileContent = fs.readFileSync(filePath);

    // Upload to S3
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: file.originalname,
      Body: fileContent,
      ContentType: file.mimetype,
    };

    s3.upload(params, (err, data) => {
      if (err) {
        console.error('Error uploading file:', err);
        return res.status(500).send('Error uploading file.');
      }

      console.log('File uploaded to S3:', data.Location); // Log S3 URL

      // Store metadata in DynamoDB
      const metadata = {
        TableName: process.env.DYNAMODB_FILES_TABLE,
        Item: {
          filename: file.originalname,
          s3Url: data.Location,
          uploadDate: new Date().toISOString(),
          userId: req.user ? req.user.email : null,
        },
      };

      dynamoDb.put(metadata, (err) => {
        if (err) {
          console.error('Error saving metadata:', err);
          return res.status(500).send('Error saving metadata.');
        }

        console.log('Metadata saved to DynamoDB'); // Log success
        res.json({ pdfUrl: data.Location });
      });
    });
  });

  // Routes
  app.use('/upload', uploadRoute);
  app.use('/tts', ttsRoute); // Use the TTS route
  app.use('/auth', authRoute); // Use the Auth route

  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  app.post('/register', (req, res) => {
    const { name, email, password } = req.body;
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) {
        return res.status(500).send('Error registering new user.');
      }

      const params = {
        TableName: process.env.DYNAMODB_USERS_TABLE,
        Item: { name, email, password: hash },
      };

      dynamoDb.put(params, (err) => {
        if (err) {
          console.error('Error registering new user:', err);
          return res.status(500).send('Error registering new user.');
        }

        res.status(200).send('User registered.');
      });
    });
  });

  app.post('/login', passport.authenticate('local', { successRedirect: '/dashboard', failureRedirect: '/' }));

  app.get('/dashboard', (req, res) => {
    if (req.isAuthenticated()) {
      const params = {
        TableName: process.env.DYNAMODB_FILES_TABLE,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': req.user.email,
        },
      };

      dynamoDb.query(params, (err, data) => {
        if (err) {
          console.error('Error fetching user data:', err);
          return res.status(500).send('Error fetching user data.');
        }

        res.status(200).json(data.Items);
      });
    } else {
      res.status(401).send('Not authenticated.');
    }
  });

  // Ensure the server listens on all network interfaces
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on port ${port}`);
  });
}
