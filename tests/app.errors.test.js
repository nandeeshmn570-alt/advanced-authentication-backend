import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";

import { app } from "../src/app.js";

test("the API returns consistent JSON for unknown routes and malformed JSON", async (t) => {
  const server = app.listen(0);
  t.after(
    () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      })
  );
  await once(server, "listening");

  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const missingRoute = await fetch(`${baseUrl}/api/v1/missing`);
  assert.equal(missingRoute.status, 404);
  assert.equal((await missingRoute.json()).success, false);
  assert.equal(missingRoute.headers.get("x-powered-by"), null);
  assert.equal(missingRoute.headers.get("x-content-type-options"), "nosniff");

  const allowedOrigin = await fetch(`${baseUrl}/api/v1/healthcheck/`, {
    headers: { Origin: "http://localhost:3000" },
  });
  assert.equal(
    allowedOrigin.headers.get("access-control-allow-origin"),
    "http://localhost:3000"
  );

  const blockedOrigin = await fetch(`${baseUrl}/api/v1/healthcheck/`, {
    headers: { Origin: "https://not-allowed.example" },
  });
  assert.equal(blockedOrigin.headers.get("access-control-allow-origin"), null);

  const malformedJson = await fetch(`${baseUrl}/api/v1/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  });
  assert.equal(malformedJson.status, 400);
  const body = await malformedJson.json();
  assert.equal(body.success, false);
  assert.match(body.message, /JSON|Unexpected end/i);

  const oversizedJson = await fetch(`${baseUrl}/api/v1/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload: "x".repeat(17 * 1024) }),
  });
  assert.equal(oversizedJson.status, 413);
  assert.equal(
    (await oversizedJson.json()).message,
    "Request body exceeds the allowed size"
  );
});
