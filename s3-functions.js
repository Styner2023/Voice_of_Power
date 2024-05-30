const s3 = require('./aws-config');

const getFileFromS3 = async (key) => {
  const params = {
    Bucket: 'voice-of-power-checkpoints',
    Key: key,
  };

  try {
    const data = await s3.getObject(params).promise();
    return data.Body;
  } catch (error) {
    console.error('Error getting file from S3:', error);
    throw error;
  }
};

module.exports = {
  getFileFromS3,
};
