require("dotenv").config();
const {
  S3Client, // Only declare S3Client once
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

// Rest of your code...
const { fromIni } = require("@aws-sdk/credential-providers");
const { SSMClient, GetParametersCommand } = require("@aws-sdk/client-ssm");
const {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
} = require("@aws-sdk/client-dynamodb");
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const path = require("path");
const bcrypt = require("bcryptjs");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const multer = require("multer");
const cors = require("cors");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// Import routes
const uploadRoute = require("./routes/upload");
const ttsRoute = require("./routes/tts");
const authRoute = require("./routes/auth");

// Import s3 from upload.js
const { s3 } = require('./routes/upload');

// Load parameters from AWS Systems Manager Parameter Store
const ssm = new SSMClient({ region: process.env.AWS_REGION });

const params = {
  Names: [
    "/voice-of-power/AWS_REGION",
    "/voice-of-power/AWS_ACCESS_KEY_ID",
    "/voice-of-power/AWS_SECRET_ACCESS_KEY",
    "/voice-of-power/DYNAMODB_USERS_TABLE",
    "/voice-of-power/DYNAMODB_FILES_TABLE",
    "/voice-of-power/S3_BUCKET_NAME",
    "/voice-of-power/JWT_SECRET",
    "/voice-of-power/PORT",
  ],
  WithDecryption: true,
};

// Rest of your code...
(async () => {
  try {
    const data = await ssm.send(new GetParametersCommand(params));
    // Assign parameters to process.env
    data.Parameters.forEach((param) => {
      const name = param.Name.split("/").pop(); // Get the parameter name without the prefix
      process.env[name] = param.Value;
    });

    // Validate if all necessary environment variables are set
    const requiredEnvVars = [
      "AWS_REGION",
      "AWS_ACCESS_KEY_ID",
      "AWS_SECRET_ACCESS_KEY",
      "DYNAMODB_USERS_TABLE",
      "DYNAMODB_FILES_TABLE",
      "S3_BUCKET_NAME",
      "JWT_SECRET",
      "PORT",
    ];

    for (const varName of requiredEnvVars) {
      if (!process.env[varName]) {
        console.error(`Environment variable ${varName} is not set.`);
        process.exit(1);
      }
    }

    // Start the server after loading parameters
    startServer();
  } catch (err) {
    console.log("Error fetching SSM parameters:", err);
    process.exit(1);
  }
})();

function startServer() {
  const app = express();
  const port = process.env.PORT || 3000;

  // AWS configuration
  const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: fromIni({ profile: "default" }), // Adjust profile as needed
    endpoint: `https://s3.${process.env.AWS_REGION}.amazonaws.com`, // Adding the endpoint here
  });

  const dynamoDb = new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: fromIni({ profile: "default" }), // Adjust profile as needed
  });

  // Multer configuration
  const storage = multer.memoryStorage();
  const upload = multer({ storage: storage });

  // Middleware
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());
  app.use(cors()); // Enable CORS
  app.use(
    session({
      secret: process.env.JWT_SECRET,
      resave: false,
      saveUninitialized: false,
    })
  );
  app.use(passport.initialize());
  app.use(passport.session());

  // Serve static files from the public directory
  app.use(express.static(path.join(__dirname, "public")));

  // Serve pdf.js files
  app.use(
    "/node_modules",
    express.static(path.join(__dirname, "node_modules"))
  );

  // Passport configuration
  passport.use(
    new LocalStrategy({ usernameField: "email" }, (email, password, done) => {
      const params = {
        TableName: process.env.DYNAMODB_USERS_TABLE,
        Key: { email: { S: email } },
      };

      dynamoDb.send(new GetItemCommand(params), (err, data) => {
        if (err) {
          return done(err);
        }
        const user = data.Item;
        if (!user) {
          return done(null, false, { message: "Incorrect email." });
        }

        bcrypt.compare(password, user.password.S, (err, res) => {
          if (res) {
            return done(null, user);
          }
          return done(null, false, { message: "Incorrect password." });
        });
      });
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.email.S);
  });

  passport.deserializeUser((email, done) => {
    const params = {
      TableName: process.env.DYNAMODB_USERS_TABLE,
      Key: { email: { S: email } },
    };

    dynamoDb.send(new GetItemCommand(params), (err, data) => {
      if (err) {
        return done(err);
      }
      done(null, data.Item);
    });
  });

  // Routes
  app.use("/api", uploadRoute);
  app.use("/api", ttsRoute); // Use the TTS route
  app.use("/api", authRoute); // Use the Auth route

  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  });

  app.post("/register", (req, res) => {
    const { name, email, password } = req.body;
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) {
        return res.status(500).send("Error registering new user.");
      }

      const params = {
        TableName: process.env.DYNAMODB_USERS_TABLE,
        Item: { name: { S: name }, email: { S: email }, password: { S: hash } },
      };

      dynamoDb.send(new PutItemCommand(params), (err) => {
        if (err) {
          console.error("Error registering new user:", err);
          return res.status(500).send("Error registering new user.");
        }

        res.status(200).send("User registered.");
      });
    });
  });

  app.post(
    "/login",
    passport.authenticate("local", {
      successRedirect: "/dashboard",
      failureRedirect: "/",
    })
  );

  app.get("/dashboard", (req, res) => {
    if (req.isAuthenticated()) {
      const params = {
        TableName: process.env.DYNAMODB_FILES_TABLE,
        KeyConditionExpression: "userId = :userId",
        ExpressionAttributeValues: {
          ":userId": { S: req.user.email.S },
        },
      };

      dynamoDb.send(new QueryCommand(params), (err, data) => {
        if (err) {
          console.error("Error fetching user data:", err);
          return res.status(500).send("Error fetching user data.");
        }

        res.status(200).json(data.Items);
      });
    } else {
      res.status(401).send("Not authenticated.");
    }
  });

  // File upload route
  const { filename } = req.params;

  // Ensure the server listens on all network interfaces
  app.listen(port, "0.0.0.0", () => {
    console.log(`Server is running on port ${port}`);
  });
}