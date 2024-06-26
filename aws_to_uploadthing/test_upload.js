const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const axios = require("axios");

// Destructure environment variables
const { UPLOADTHING_SECRET, UPLOADTHING_APP_ID } = process.env;

// Log environment variables for debugging
console.log("UPLOADTHING_SECRET:", UPLOADTHING_SECRET);
console.log("UPLOADTHING_APP_ID:", UPLOADTHING_APP_ID);

// Validate required environment variables
if (!UPLOADTHING_SECRET || !UPLOADTHING_APP_ID) {
  console.error(
    "Missing required environment variables. Please check your .env file."
  );
  process.exit(1);
}

// Function to upload a small test chunk
const uploadTestChunk = async () => {
  const chunkBuffer = Buffer.from("test data");
  const chunkFileName = `test-file.txt.part1`;

  // Upload the chunk to UploadThing
  try {
    console.log(`Uploading chunk: ${chunkFileName}`);
    const headers = {
      "Content-Type": "application/octet-stream",
      Authorization: `Bearer ${UPLOADTHING_SECRET}`,
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
    console.log(`Successfully uploaded chunk: ${chunkFileName}`, response.data);
  } catch (error) {
    if (error.response) {
      console.error(
        `Error uploading chunk: ${chunkFileName}`,
        `Status: ${error.response.status}, Data: ${JSON.stringify(
          error.response.data
        )}`
      );
    } else {
      console.error(`Error uploading chunk: ${chunkFileName}`, error.message);
    }
  }
};

uploadTestChunk();
