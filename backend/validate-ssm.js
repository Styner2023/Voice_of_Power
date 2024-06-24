const AWS = require('aws-sdk');

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
    console.error('Error fetching SSM parameters:', err);
  } else {
    console.log('SSM parameters fetched successfully:');
    data.Parameters.forEach(param => {
      console.log(`${param.Name}: ${param.Value}`);
    });
  }
});
