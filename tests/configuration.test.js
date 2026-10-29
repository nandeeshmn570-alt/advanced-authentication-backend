import test from "node:test";
import assert from "node:assert/strict";

import { getCorsOrigins, validateEnv } from "../src/config/env.js";
import { upload } from "../src/middlewares/multer.middleware.js";

test("validateEnv requires database and token configuration", () => {
  assert.throws(
    () => validateEnv({}),
    /MONGODB_URI, ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET/
  );
  assert.deepEqual(
    validateEnv({
      MONGODB_URI: "mongodb://localhost",
      ACCESS_TOKEN_SECRET: "access",
      REFRESH_TOKEN_SECRET: "refresh",
      PORT: "9000",
      NODE_ENV: "test",
    }),
    { port: 9000 }
  );
});

test("validateEnv applies production secret, cloud, CORS, and port checks", () => {
  const validProductionEnv = {
    MONGODB_URI: "mongodb://localhost",
    ACCESS_TOKEN_SECRET: "a".repeat(32),
    ACCESS_TOKEN_EXPIRY: "15m",
    REFRESH_TOKEN_SECRET: "b".repeat(32),
    REFRESH_TOKEN_EXPIRY: "7d",
    CLOUDINARY_CLOUD_NAME: "cloud",
    CLOUDINARY_API_KEY: "key",
    CLOUDINARY_API_SECRET: "secret",
    CORS_ORIGIN: "https://app.example.com",
    NODE_ENV: "production",
    PORT: "443",
  };
  assert.deepEqual(validateEnv(validProductionEnv), { port: 443 });
  assert.throws(
    () =>
      validateEnv({
        ...validProductionEnv,
        ACCESS_TOKEN_SECRET: "short",
      }),
    /at least 32 characters/
  );
  assert.throws(
    () =>
      validateEnv({
        ...validProductionEnv,
        REFRESH_TOKEN_SECRET: "replace-with-a-long-random-secret",
      }),
    /placeholder value/
  );
  assert.throws(
    () =>
      validateEnv({
        ...validProductionEnv,
        CLOUDINARY_API_SECRET: "",
      }),
    /CLOUDINARY_API_SECRET/
  );
  assert.throws(
    () => validateEnv({ ...validProductionEnv, PORT: "70000" }),
    /PORT must be an integer/
  );
});

test("CORS origins must be explicit HTTP(S) origins and uploads are bounded", () => {
  assert.deepEqual(
    getCorsOrigins("https://app.example.com, http://localhost:3000"),
    ["https://app.example.com", "http://localhost:3000"]
  );
  assert.throws(() => getCorsOrigins("*"), /Invalid CORS origin/);
  assert.equal(upload.limits.fileSize, 50 * 1024 * 1024);
  assert.equal(upload.limits.files, 2);
});
