import multer from 'multer';
import path from 'path';
import { Request } from 'express';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploadedImages');
console.log("Upload directory path: ", uploadDir);

// Make sure directory has correct permissions
if (!fs.existsSync(uploadDir)) {
  console.log("Creating upload directory");
  fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 }); // Added mode for proper permissions
} else {
  console.log("Upload directory already exists");
  // Update permissions on existing directory
  fs.chmodSync(uploadDir, 0o755);
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log("Saving file to: ", uploadDir);  // Log where files are being saved
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter function to accept only images
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

// Create the multer upload instance
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB file size limit
  },
  fileFilter: fileFilter
}); 