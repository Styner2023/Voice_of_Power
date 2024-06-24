const crypto = require("crypto");

function generateSecretKey() {
  return crypto.randomBytes(64).toString("hex");
}

console.log(generateSecretKey());
