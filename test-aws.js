require('dotenv').config();
const AWS = require('aws-sdk');

AWS.config.update({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const s3 = new AWS.S3();

const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: 'test-file.txt'
};

s3.getObject(params, (err, data) => {
    if (err) {
        console.log('Error:', err);
    } else {
        console.log('Success:', data);
    }
});
