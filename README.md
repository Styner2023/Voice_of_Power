# Voice of Power

Voice of Power is a web application that allows users to upload PDF books and have them read aloud using Text-to-Speech (TTS) technology. The application supports multiple languages, various voices, and two reading speeds. It is designed to be accessible 24/7, hosted for free, and aims to help individuals, including the formerly incarcerated, to have their stories read aloud.

## Table of Contents

- [Features](#features)
- [Technologies](#technologies)
- [Installation](#installation)
- [Usage](#usage)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## Features

- Upload and store PDF files.
- Convert PDF text to speech using various TTS models.
- Support for multiple languages and voices.
- Two reading speeds.
- User authentication and account management.
- AWS S3 integration for file storage.
- MongoDB integration for user and book data.

## Technologies

- Node.js
- Express
- MongoDB with Mongoose
- Passport for authentication
- AWS S3 for file storage
- Docker for containerization
- MinIO for object storage
- Multer for file uploads
- Text-to-Speech (TTS) using OpenVoice or Coqui XTTS-v2

## Installation

1. **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/voice-of-power.git
    cd voice-of-power
    ```

2. **Install dependencies:**
    ```bash
    npm install
    ```

3. **Set up environment variables:**
    Create a `.env` file in the root directory and add the following:
    ```plaintext
    PORT=3000
    MONGO_URI=mongodb://localhost:27017/voice_of_power
    JWT_SECRET=your_jwt_secret
    AWS_REGION=your_aws_region
    AWS_ACCESS_KEY_ID=your_aws_access_key_id
    AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
    ```

4. **Start MongoDB:**
    Ensure MongoDB is running on your local machine:
    ```bash
    sudo systemctl start mongod
    ```

5. **Run the application:**
    ```bash
    npm start
    ```

## Usage

1. **Register a new user:**
    Navigate to `http://localhost:3000/register` and create a new account.

2. **Login:**
    Navigate to `http://localhost:3000/login` and login with your credentials.

3. **Upload a PDF:**
    Navigate to the upload page and select a PDF file to upload. The file will be processed and stored on AWS S3.

4. **Convert text to speech:**
    Use the TTS functionality to convert the uploaded PDF text to speech.

## Environment Variables

Ensure you set the following environment variables in your `.env` file:

- `PORT`: Port number the server will listen on.
- `MONGO_URI`: MongoDB connection string.
- `JWT_SECRET`: Secret key for JSON Web Token.
- `AWS_REGION`: AWS region for S3.
- `AWS_ACCESS_KEY_ID`: AWS access key ID.
- `AWS_SECRET_ACCESS_KEY`: AWS secret access key.

## Project Structure

```plaintext
voice-of-power/
├── models/
│   ├── book.js
│   └── user.js
├── routes/
│   ├── auth.js
│   ├── tts.js
│   └── upload.js
├── uploads/
├── .env
├── server.js
├── package.json
└── README.md

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the repository.**
2. **Create your feature branch:** `git checkout -b feature/your-feature`.
3. **Commit your changes:** `git commit -m 'Add some feature'`.
4. **Push to the branch:** `git push origin feature/your-feature`.
5. **Open a pull request.**

## Acknowledgments

- Special thanks to the open-source community for their valuable contributions.
- Inspired by the need to help individuals have their stories read aloud.

## 📁 Voice of Power Architecture 📁

[Voice of Power Architecture Repository](https://github.com/Styner2023/voice-of-power-architecture)

This repository contains the detailed architectural design and documentation for the Voice of Power project. Below are the key files and diagrams included in the repository:

### Project Files

- [SOFTWARE_ARCHITECTURE.md](https://github.com/Styner2023/voice-of-power-architecture/blob/main/SOFTWARE_ARCHITECTURE.md): Detailed architectural documentation.

### UML Diagrams

#### Activity Diagram

![Activity Diagram](https://github.com/Styner2023/voice-of-power-architecture/raw/main/activity_diagram.png)

#### Class Diagram

![Class Diagram](https://github.com/Styner2023/voice-of-power-architecture/raw/main/class_diagram.png)

#### Sequence Diagram

![Sequence Diagram](https://github.com/Styner2023/voice-of-power-architecture/raw/main/sequence_diagram.png)

#### Use Case Diagram

![Use Case Diagram](https://github.com/Styner2023/voice-of-power-architecture/raw/main/use_case_diagram.png)
