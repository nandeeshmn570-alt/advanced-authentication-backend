import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

import { verifyJWT } from "../src/middlewares/auth.middleware.js";
import { User } from "../src/models/user.model.js";

const ownerId = "507f1f77bcf86cd799439013";

function invoke(token, { user = null } = {}) {
  return new Promise((resolve) => {
    const request = {
      cookies: token ? { accessToken: token } : {},
      header: () => undefined,
    };

    verifyJWT(request, {}, (error) => {
      resolve({ request, error, user });
    });
  });
}

test("verifyJWT rejects missing access tokens", async (t) => {
  const findById = t.mock.method(User, "findById", () => ({
    select: async () => null,
  }));

  const { error } = await invoke();

  assert.equal(error.statusCode, 401);
  assert.equal(findById.mock.callCount(), 0);
});

test("verifyJWT rejects invalid tokens", async (t) => {
  process.env.ACCESS_TOKEN_SECRET = "test-access-secret";
  t.mock.method(User, "findById", () => ({
    select: async () => null,
  }));

  const token = jwt.sign({ _id: ownerId }, "different-secret");
  const { error } = await invoke(token);

  assert.equal(error.statusCode, 401);
});

test("verifyJWT loads the user and continues for a valid bearer token", async (t) => {
  process.env.ACCESS_TOKEN_SECRET = "test-access-secret";
  const user = { _id: ownerId, username: "test-user" };
  const select = t.mock.fn(async () => user);
  const findById = t.mock.method(User, "findById", () => ({ select }));
  const token = jwt.sign({ _id: ownerId }, process.env.ACCESS_TOKEN_SECRET);

  const request = {
    cookies: {},
    header: (name) =>
      name === "Authorization" ? `Bearer ${token}` : undefined,
  };
  const result = await new Promise((resolve) => {
    verifyJWT(request, {}, (error) => resolve({ error, request }));
  });

  assert.equal(result.error, undefined);
  assert.equal(result.request.user, user);
  assert.equal(findById.mock.calls[0].arguments[0], ownerId);
  assert.equal(select.mock.calls[0].arguments[0], "-password -refreshToken");
});

test("verifyJWT rejects a valid token whose user no longer exists", async (t) => {
  process.env.ACCESS_TOKEN_SECRET = "test-access-secret";
  t.mock.method(User, "findById", () => ({
    select: async () => null,
  }));

  const token = jwt.sign({ _id: ownerId }, process.env.ACCESS_TOKEN_SECRET);
  const { error } = await invoke(token);

  assert.equal(error.statusCode, 401);
});
