import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import jwt from "jsonwebtoken";

import { app } from "../src/app.js";
import { User } from "../src/models/user.model.js";

const userId = "507f1f77bcf86cd799439011";

test("login, account update, and logout work through authenticated HTTP routes", async (t) => {
  process.env.ACCESS_TOKEN_SECRET = "account-api-access-test-secret";
  process.env.REFRESH_TOKEN_SECRET = "account-api-refresh-test-secret";
  const user = {
    _id: userId,
    username: "test-user",
    email: "test@example.com",
    fullName: "Test User",
    isPasswordCorrect: async (password) => password === "correct-password",
    generateAccessToken() {
      return jwt.sign({ _id: userId }, process.env.ACCESS_TOKEN_SECRET);
    },
    generateRefreshToken() {
      return jwt.sign({ _id: userId }, process.env.REFRESH_TOKEN_SECRET);
    },
    async save() {},
    async select() {
      return this;
    },
  };
  t.mock.method(User, "findOne", async () => user);
  t.mock.method(User, "findById", () => ({
    select: async () => user,
    then(resolve, reject) {
      return Promise.resolve(user).then(resolve, reject);
    },
  }));
  const updateAccount = t.mock.method(User, "findByIdAndUpdate", () => ({
    select: async () => ({
      _id: userId,
      fullName: "Updated User",
      email: "updated@example.com",
    }),
  }));

  const server = app.listen(0);
  t.after(
    () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      })
  );
  await once(server, "listening");
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/v1/users`;

  const invalidLogin = await fetch(`${baseUrl}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "test-user", password: "wrong-password" }),
  });
  assert.equal(invalidLogin.status, 401);

  const login = await fetch(`${baseUrl}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "TEST@example.com",
      password: "correct-password",
    }),
  });
  assert.equal(login.status, 200);
  const loginBody = await login.json();
  assert.equal(loginBody.data.user._id, userId);
  assert.equal(loginBody.data.user.password, undefined);
  const cookies = login.headers.get("set-cookie");
  assert.match(cookies, /accessToken=/);
  assert.match(cookies, /refreshToken=/);
  assert.match(cookies, /HttpOnly/i);

  const accessToken = loginBody.data.accessToken;
  const authHeaders = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  const currentUser = await fetch(`${baseUrl}/current-user`, {
    headers: authHeaders,
  });
  assert.equal(currentUser.status, 200);
  assert.equal((await currentUser.json()).data._id, userId);

  const update = await fetch(`${baseUrl}/update-account`, {
    method: "PATCH",
    headers: authHeaders,
    body: JSON.stringify({
      fullName: " Updated User ",
      email: " UPDATED@example.com ",
    }),
  });
  assert.equal(update.status, 200);
  assert.equal((await update.json()).data.email, "updated@example.com");
  assert.equal(
    updateAccount.mock.calls[0].arguments[1].$set.fullName,
    "Updated User"
  );

  const invalidUpdate = await fetch(`${baseUrl}/update-account`, {
    method: "PATCH",
    headers: authHeaders,
    body: JSON.stringify({ fullName: "No email", email: "invalid" }),
  });
  assert.equal(invalidUpdate.status, 400);

  const logout = await fetch(`${baseUrl}/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get("set-cookie"), /accessToken=;/);
  assert.match(logout.headers.get("set-cookie"), /refreshToken=;/);
  assert.deepEqual((await logout.json()).data, {});
});
