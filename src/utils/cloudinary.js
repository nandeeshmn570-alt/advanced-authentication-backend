import { v2 as cloudinary } from "cloudinary";
import fs from "node:fs/promises";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOncloudinary = async (localFilePath) => {
  if (!localFilePath) return null;

  try {
    return await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
  } finally {
    try {
      await fs.unlink(localFilePath);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }
};

export { uploadOncloudinary };
