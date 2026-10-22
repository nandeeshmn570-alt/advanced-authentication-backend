import multer from "multer";
import { mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const destination = path.join(process.cwd(), "public", "temp");
    mkdir(destination, { recursive: true }).then(
      () => cb(null, destination),
      cb
    );
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${randomUUID()}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});
