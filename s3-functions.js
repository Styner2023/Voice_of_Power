const AWS = require('aws-sdk');

// AWS S3 configuration
AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const s3 = new AWS.S3();

const uploadToS3 = (key, body, contentType, callback) => {
  const params = {
    Bucket: 'voice-of-power-checkpoints',
    Key: key,
    Body: body,
    ContentType: contentType,
  };

  s3.upload(params, (err, data) => {
    if (err) {
      console.error('Error uploading file:', err);
      return callback(err);
    }
    callback(null, data);
  });
};

const getFileFromS3 = async (key) => {
  const params = {
    Bucket: 'voice-of-power-checkpoints',
    Key: key,
  };
  return s3.getObject(params).promise();
};

module.exports = { uploadToS3, getFileFromS3 };
