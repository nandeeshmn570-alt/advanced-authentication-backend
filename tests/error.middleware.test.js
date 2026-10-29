import test from "node:test";
import assert from "node:assert/strict";

import { errorHandler } from "../src/middlewares/error.middleware.js";
import { ApiError } from "../src/utils/ApiError.js";

function createResponse() {
  return {
    statusCode: undefined,
    body: undefined,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("errorHandler returns client errors without logging server failures", (t) => {
  const log = t.mock.method(console, "error", () => {});
  const response = createResponse();

  errorHandler(
    new ApiError(403, "Not authorized"),
    { method: "DELETE", originalUrl: "/api/v1/resource" },
    response,
    () => {}
  );

  assert.equal(response.statusCode, 403);
  assert.deepEqual(response.body, {
    success: false,
    message: "Not authorized",
    errors: [],
  });
  assert.equal(log.mock.callCount(), 0);
});

test("errorHandler logs server errors and hides internal details", (t) => {
  const log = t.mock.method(console, "error", () => {});
  const response = createResponse();

  errorHandler(
    new Error("database credentials must not be sent to clients"),
    { method: "GET", originalUrl: "/api/v1/private" },
    response,
    () => {}
  );

  assert.equal(response.statusCode, 500);
  assert.equal(response.body.message, "Internal server error");
  assert.equal(JSON.stringify(response.body).includes("credentials"), false);
  assert.equal(log.mock.callCount(), 1);
});

test("errorHandler maps duplicate-key database errors to conflicts", () => {
  const response = createResponse();

  errorHandler(
    Object.assign(new Error("duplicate value"), { code: 11000 }),
    { method: "POST", originalUrl: "/api/v1/users" },
    response,
    () => {}
  );

  assert.equal(response.statusCode, 409);
  assert.equal(
    response.body.message,
    "A record with these values already exists"
  );
});
