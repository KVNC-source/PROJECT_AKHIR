// server.js
// This Node.js server handles receiving image data and labels from the frontend
// and saving them to a local folder, now using ES Module syntax.

import express from "express"; // Use import for express
import multer from "multer"; // Use import for multer
import cors from "cors"; // Use import for cors
import path from "path"; // Path is a built-in Node.js module
import { fileURLToPath } from "url"; // For __dirname equivalent in ESM
import { dirname } from "path";
import fs from "fs"; // Use import for fs

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3001; // The backend server will listen on port 3001

// Enable CORS for all origins during development.
app.use(cors());

// Enable parsing of JSON request bodies.
app.use(express.json());

// Define the directory where uploaded images will be stored.
const UPLOADS_DIR = path.join(__dirname, "uploaded_images");

// Create the uploads directory if it does not already exist.
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  console.log(`Created upload directory: ${UPLOADS_DIR}`);
}

// Configure Multer for file storage.
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR); // Set the destination directory for uploaded files.
  },
  filename: function (req, file, cb) {
    // Generate a unique filename: originalname-timestamp.extension
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    const filename = `${baseName}-${Date.now()}${ext}`;
    cb(null, filename);
  },
});

const upload = multer({ storage: storage });

// Define the API endpoint for image uploads.
app.post("/upload-image", upload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided." });
    }

    const { label } = req.body;

    console.log(`Image saved: ${req.file.filename}`);
    console.log(`Associated label: ${label || "No label provided"}`);

    res.status(200).json({
      message: "Image and label saved successfully!",
      filename: req.file.filename,
      label: label,
    });
  } catch (error) {
    console.error("Error saving image:", error);
    res
      .status(500)
      .json({ message: "Failed to save image.", error: error.message });
  }
});

// Start the Express server.
app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
  console.log(`Uploaded images will be saved in: ${UPLOADS_DIR}`);
});
