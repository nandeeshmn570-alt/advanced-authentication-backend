import { URL } from "node:url";

const REQUIRED_ENV_VARS = [
  "MONGODB_URI",
  "ACCESS_TOKEN_SECRET",
  "REFRESH_TOKEN_SECRET",
];

export function getCorsOrigins(value = process.env.CORS_ORIGIN) {
  if (!value?.trim()) {
    return process.env.NODE_ENV === "production"
      ? []
      : ["http://localhost:3000"];
  }

  return value.split(",").map((entry) => {
    const origin = entry.trim();
    let parsedOrigin;

    try {
      parsedOrigin = new URL(origin);
    } catch {
      throw new Error(`Invalid CORS origin: ${origin}`);
    }

    if (
      !["http:", "https:"].includes(parsedOrigin.protocol) ||
      parsedOrigin.origin !== origin
    ) {
      throw new Error(
        `CORS origins must be explicit HTTP(S) origins: ${origin}`
      );
    }

    return parsedOrigin.origin;
  });
}

export function validateEnv(env = process.env) {
  const missing = REQUIRED_ENV_VARS.filter((name) => !env[name]?.trim());
  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  const port = Number(env.PORT ?? 8000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  if (env.NODE_ENV === "production") {
    for (const name of ["ACCESS_TOKEN_SECRET", "REFRESH_TOKEN_SECRET"]) {
      if (env[name].length < 32) {
        throw new Error(`${name} must be at least 32 characters in production`);
      }
      if (/replace|change.?me|your[_ -]/i.test(env[name])) {
        throw new Error(
          `${name} must not use a placeholder value in production`
        );
      }
    }
    for (const name of ["ACCESS_TOKEN_EXPIRY", "REFRESH_TOKEN_EXPIRY"]) {
      if (!env[name]?.trim()) {
        throw new Error(`Missing required environment variable: ${name}`);
      }
    }

    for (const name of [
      "CLOUDINARY_CLOUD_NAME",
      "CLOUDINARY_API_KEY",
      "CLOUDINARY_API_SECRET",
    ]) {
      if (!env[name]?.trim()) {
        throw new Error(`Missing required environment variable: ${name}`);
      }
    }

    if (!env.CORS_ORIGIN?.trim()) {
      throw new Error("CORS_ORIGIN is required in production");
    }
  }

  getCorsOrigins(env.CORS_ORIGIN);

  return { port };
}
