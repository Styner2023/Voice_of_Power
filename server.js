// Load environment variables from .env file for local development
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const cors = require('cors');
const { SSMClient, GetParametersCommand } = require('@aws-sdk/client-ssm');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { PutCommand, DynamoDBDocumentClient, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const uploadRoute = require('./routes/upload');
const ttsRoute = require('./routes/tts');
const authRoute = require('./routes/auth');

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

// Load parameters from AWS Systems Manager Parameter Store
const ssm = new SSMClient({ region: 'us-west-1' });
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

ssm.send(new GetParametersCommand(params)).then((data) => {
  data.Parameters.forEach((param) => {
    const name = param.Name.split('/').pop();
    process.env[name] = param.Value;
    console.log(`Setting ${name} to ${param.Value}`);
  });

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

  startServer();
}).catch((err) => {
  console.log('Error fetching SSM parameters:', err);
  process.exit(1);
});

function startServer() {
  const app = express();
  const port = process.env.PORT || 3000;

  const s3 = new S3Client({ region: process.env.AWS_REGION });
  const dynamoDbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
  const dynamoDb = DynamoDBDocumentClient.from(dynamoDbClient);

  app.use(cors());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());
  app.use(session({ secret: process.env.JWT_SECRET, resave: false, saveUninitialized: false }));
  app.use(passport.initialize());
  app.use(passport.session());

  // Serve static files from node_modules
  app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

  // Serve static files from the public folder
  app.use(express.static(path.join(__dirname, 'public')));

  // Serve the uploads folder
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  passport.use(new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
    const params = {
      TableName: process.env.DYNAMODB_USERS_TABLE,
      Key: { email },
    };

    dynamoDb.send(new GetCommand(params), (err, data) => {
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

    dynamoDb.send(new GetCommand(params), (err, data) => {
      if (err) {
        return done(err);
      }
      done(null, data.Item);
    });
  });

  const upload = multer({ dest: 'uploads/' });

  app.post('/upload', upload.single('file'), (req, res) => {
    const { file } = req;
    const filePath = path.join(__dirname, file.path);
    console.log('File received:', file); // Log file details

    // Add debug logging here
    console.log('AWS_REGION:', process.env.AWS_REGION);
    console.log('S3_BUCKET_NAME:', process.env.S3_BUCKET_NAME);

    // Read file content
    const fileContent = fs.readFileSync(filePath);

    // Upload to S3
    const s3Params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: file.originalname,
      Body: fileContent,
      ContentType: file.mimetype,
    };

    s3.send(new PutObjectCommand(s3Params)).then((data) => {
      const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${file.originalname}`;
      console.log('File uploaded to S3:', fileUrl); // Log S3 URL

      // Store metadata in DynamoDB
      const metadata = {
        TableName: process.env.DYNAMODB_FILES_TABLE,
        Item: {
          filename: file.originalname,
          s3Url: fileUrl,
          uploadDate: new Date().toISOString(),
          userId: req.user ? req.user.email : null,
        },
      };

      dynamoDb.send(new PutCommand(metadata)).then(() => {
        console.log('Metadata saved to DynamoDB'); // Log success
        res.json({ fileUrl }); // Return the file URL in the response
      }).catch((err) => {
        console.error('Error saving metadata:', err);
        res.status(500).send('Error saving metadata.');
      });
    }).catch((err) => {
      console.error('Error uploading file:', err);
      res.status(500).send('Error uploading file.');
    });
  });

  app.use('/upload', uploadRoute);
  app.use('/tts', ttsRoute);
  app.use('/auth', authRoute);

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

      dynamoDb.send(new PutCommand(params)).then(() => {
        res.status(200).send('User registered.');
      }).catch((err) => {
        console.error('Error registering new user:', err);
        res.status(500).send('Error registering new user.');
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

      dynamoDb.send(new QueryCommand(params)).then((data) => {
        res.status(200).json(data.Items);
      }).catch((err) => {
        console.error('Error fetching user data:', err);
        res.status(500).send('Error fetching user data.');
      });
    } else {
      res.status(401).send('Not authenticated.');
    }
  });

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on port ${port}`);
  });
}
