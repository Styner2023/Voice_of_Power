const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const AWS = require("aws-sdk");
const axios = require("axios");
const fs = require("fs-extra");
const chunk = require("chunk");

const {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_REGION,
  S3_BUCKET_NAME,
  UPLOADTHING_SECRET,
  UPLOADTHING_APP_ID,
} = process.env;

console.log("AWS_ACCESS_KEY_ID:", AWS_ACCESS_KEY_ID);
console.log("AWS_SECRET_ACCESS_KEY:", AWS_SECRET_ACCESS_KEY);
console.log("AWS_REGION:", AWS_REGION);
console.log("S3_BUCKET_NAME:", S3_BUCKET_NAME);
console.log("UPLOADTHING_APP_ID:", UPLOADTHING_APP_ID);
console.log("UPLOADTHING_SECRET:", UPLOADTHING_SECRET);

if (
  !AWS_ACCESS_KEY_ID ||
  !AWS_SECRET_ACCESS_KEY ||
  !AWS_REGION ||
  !S3_BUCKET_NAME ||
  !UPLOADTHING_SECRET ||
  !UPLOADTHING_APP_ID
) {
  console.error(
    "Missing required environment variables. Please check your .env file."
  );
  process.exit(1);
}

AWS.config.update({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: AWS_REGION,
});

const s3 = new AWS.S3();

const MAX_CHUNK_SIZE = 4 * 1024 * 1024;

const uploadFileInChunks = async (filePath, fileName) => {
  const fileBuffer = await fs.readFile(filePath);
  const fileChunks = chunk(fileBuffer, MAX_CHUNK_SIZE);

  for (let i = 0; i < fileChunks.length; i++) {
    const chunkBuffer = fileChunks[i];
    const chunkFileName = `${fileName}.part${i + 1}`;

    try {
      console.log(`Uploading chunk: ${chunkFileName}`);
      const headers = {
        "Content-Type": "application/octet-stream",
        Authorization: `Bearer ${UPLOADTHING_SECRET}`,
        "x-api-key": UPLOADTHING_SECRET,
      };
      const params = { fileName: chunkFileName };
      console.log("Request headers:", headers);
      console.log("Request params:", params);
      const response = await axios.post(
        `https://api.uploadthing.com/upload/${UPLOADTHING_APP_ID}`,
        chunkBuffer,
        {
          headers,
          params,
        }
      );
      console.log(
        `Successfully uploaded chunk: ${chunkFileName}`,
        response.data
      );
    } catch (error) {
      if (error.response) {
        console.error(
          `Error uploading chunk: ${chunkFileName}`,
          `Status: ${error.response.status}, Data: ${JSON.stringify(
            error.response.data
          )}`
        );
        // Retry with only Authorization header
        if (error.response.status === 400) {
          try {
            const headersAlt = {
              "Content-Type": "application/octet-stream",
              Authorization: `Bearer ${UPLOADTHING_SECRET}`,
            };
            console.log("Retrying with headers:", headersAlt);
            const responseAlt = await axios.post(
              `https://api.uploadthing.com/upload/${UPLOADTHING_APP_ID}`,
              chunkBuffer,
              {
                headers: headersAlt,
                params,
              }
            );
            console.log(
              `Successfully uploaded chunk on retry: ${chunkFileName}`,
              responseAlt.data
            );
          } catch (retryError) {
            console.error(
              `Retry failed for chunk: ${chunkFileName}`,
              `Status: ${retryError.response.status}, Data: ${JSON.stringify(
                retryError.response.data
              )}`
            );
          }
        }
      } else {
        console.error(`Error uploading chunk: ${chunkFileName}`, error.message);
      }
    }
  }

  await fs.remove(filePath);
};

const processS3Files = async () => {
  try {
    const s3Objects = await s3
      .listObjectsV2({ Bucket: S3_BUCKET_NAME })
      .promise();

    for (const s3Object of s3Objects.Contents) {
      const s3ObjectKey = s3Object.Key;
      const s3ObjectParams = {
        Bucket: S3_BUCKET_NAME,
        Key: s3ObjectKey,
      };

      const s3ObjectData = await s3.getObject(s3ObjectParams).promise();
      const localFilePath = path.join(__dirname, "temp", s3ObjectKey);

      await fs.outputFile(localFilePath, s3ObjectData.Body);
      console.log(`Downloaded ${s3ObjectKey} to ${localFilePath}`);

      await uploadFileInChunks(localFilePath, s3ObjectKey);
    }
  } catch (error) {
    console.error("Error processing S3 files", error);
  }
};

processS3Files();

// This approach ensures my code remains clean, handles large file uploads efficiently,
// and manages environment configurations properly. By using object destructuring, I can
// easily extract the necessary environment variables. Additionally, by addressing the chunk
// size issue, I can ensure that large files are handled efficiently. Lastly, I validate
// the presence of required environment variables to ensure my application behaves as expected.
