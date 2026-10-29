import multer from "multer";
import { ApiError } from "../utils/ApiError.js";

export function notFoundHandler(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.path}`));
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const isMulterError = error instanceof multer.MulterError;
  const isMalformedJson = error.type === "entity.parse.failed";
  const isPayloadTooLarge = error.type === "entity.too.large";
  const isDuplicateKey = error.code === 11000;
  const isValidationError = error.name === "ValidationError";
  const isCastError = error.name === "CastError";
  const statusCode = isPayloadTooLarge
    ? 413
    : isMulterError || isMalformedJson
    ? 400
    : isDuplicateKey
    ? 409
    : isValidationError || isCastError
    ? 400
    : Number.isInteger(error.statusCode ?? error.status) &&
      (error.statusCode ?? error.status) >= 400 &&
      (error.statusCode ?? error.status) < 500
    ? error.statusCode ?? error.status
    : 500;
  const message =
    statusCode >= 500
      ? "Internal server error"
      : isPayloadTooLarge
      ? "Request body exceeds the allowed size"
      : isMulterError
      ? error.code === "LIMIT_FILE_SIZE"
        ? "Uploaded file exceeds the allowed size"
        : error.message
      : isDuplicateKey
      ? "A record with these values already exists"
      : isValidationError
      ? error.message
      : isCastError
      ? `Invalid value for ${error.path}`
      : error.message || "Request failed";

  if (statusCode >= 500) {
    console.error("Unhandled request error", {
      method: req.method,
      path: req.originalUrl,
      error,
    });
  }

  return res.status(statusCode).json({
    success: false,
    message,
    errors: error.errors ?? [],
  });
}
