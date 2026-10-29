import multer from "multer";
import path from "path";

// Where and how to store uploaded files
const storage = multer.diskStorage({
  destination: "./public/temp",

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = Date.now() + ext;

    cb(null, name);
  },
});

// Configure Multer
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 2,
    fields: 20,
    parts: 24,
  },
  fileFilter: (req, file, callback) => {
    if (
      file.mimetype?.startsWith("image/") ||
      file.mimetype?.startsWith("video/")
    ) {
      return callback(null, true);
    }
    const error = new Error("Unsupported media type");
    error.statusCode = 400;
    return callback(error);
  },
});
