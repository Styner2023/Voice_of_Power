const Minio = require('minio');

// Initialize the MinIO client
const minioClient = new Minio.Client({
  endPoint: 'localhost',
  port: 9000,
  useSSL: false,
  accessKey: 'MyRootUsernameforObjectStorage@2020', // Replace with your actual access key
  secretKey: 'MyRootPasswordforObjectStorage@2020'  // Replace with your actual secret key
});

// Define the bucket name and file paths
const bucketName = 'voice-of-power-bucket'; // Replace with your bucket name
const filesToUpload = [
  { path: 'checkpoints_v1/base_speakers/EN/checkpoint.pth', name: 'checkpoint_v1_EN.pth' },
  { path: 'checkpoints_v1/base_speakers/ZH/checkpoint.pth', name: 'checkpoint_v1_ZH.pth' },
  { path: 'checkpoints_v1/converter/checkpoint.pth', name: 'checkpoint_v1_converter.pth' },
  { path: 'checkpoints_v2/converter/checkpoint.pth', name: 'checkpoint_v2_converter.pth' }
];

// Create the bucket if it doesn't exist
minioClient.bucketExists(bucketName, function(err) {
  if (err) {
    if (err.code === 'NoSuchBucket') {
      minioClient.makeBucket(bucketName, 'us-east-1', function(err) {
        if (err) return console.log('Error creating bucket.', err);
        console.log('Bucket created successfully.');
        uploadFiles();
      });
    } else {
      return console.log('Error checking bucket.', err);
    }
  } else {
    uploadFiles();
  }
});

// Function to upload files
function uploadFiles() {
  filesToUpload.forEach(file => {
    minioClient.fPutObject(bucketName, file.name, file.path, function(err, etag) {
      if (err) return console.log('Error uploading file.', err);
      console.log(`File ${file.name} uploaded successfully.`);
    });
  });
}


