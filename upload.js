require('dotenv').config({ path: '/home/ubuntu/Voice_of_Power/.env' }); // Load environment variables from .env

const AWS = require('aws-sdk');
const fs = require('fs');

// Configure AWS SDK
const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

// Function to upload a file to S3
const uploadFile = (filePath, bucketName, key) => {
  const fileContent = fs.readFileSync(filePath);

  const params = {
    Bucket: bucketName,
    Key: key,
    Body: fileContent
  };

  s3.upload(params, (err, data) => {
    if (err) {
      console.error('Error uploading file:', err);
    } else {
      console.log(`File uploaded successfully at ${data.Location}`);
    }
  });
};

// Example usage
const filePath = '/home/ubuntu/Voice_of_Power/new-file.pdf'; // Update with your actual file path
const bucketName = process.env.S3_BUCKET_NAME;
const key = 'new-file.pdf'; // Update with your desired key

uploadFile(filePath, bucketName, key);
