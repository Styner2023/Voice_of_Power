const fs = require('fs');
const filePath = '/home/ubuntu/Voice_of_Power/new-file.pdf';

// Check if the file exists
if (!fs.existsSync(filePath)) {
  // Create the file if it doesn't exist
  fs.writeFileSync(filePath, '');
  console.log(`File created: ${filePath}`);
} else {
  console.log(`File already exists: ${filePath}`);
}
