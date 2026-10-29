import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import jwt from "jsonwebtoken";

import { app } from "../src/app.js";
import { Comment } from "../src/models/comment.model.js";
import { User } from "../src/models/user.model.js";
import { Video } from "../src/models/video.model.js";

const videoId = "507f1f77bcf86cd799439011";
const commentId = "507f1f77bcf86cd799439012";
const ownerId = "507f1f77bcf86cd799439013";

test("authenticated comment API supports a create/read/update/delete lifecycle", async (t) => {
  process.env.ACCESS_TOKEN_SECRET = "comment-api-test-secret";
  const user = { _id: ownerId, username: "test-user" };
  let storedComment = null;

  t.mock.method(User, "findById", () => ({
    select: async () => user,
  }));
  t.mock.method(Video, "findById", async (id) =>
    id === videoId ? { _id: videoId } : null
  );
  t.mock.method(Comment, "create", async (comment) => {
    storedComment = {
      ...comment,
      _id: commentId,
      owner: ownerId,
      async save() {
        return this;
      },
    };
    return storedComment;
  });
  t.mock.method(Comment, "find", () => ({
    sort() {
      return this;
    },
    skip() {
      return this;
    },
    limit() {
      return this;
    },
    populate() {
      return Promise.resolve(storedComment ? [storedComment] : []);
    },
  }));
  t.mock.method(Comment, "countDocuments", async () => (storedComment ? 1 : 0));
  t.mock.method(Comment, "findById", async (id) =>
    id === commentId ? storedComment : null
  );
  t.mock.method(Comment, "deleteOne", async () => {
    storedComment = null;
    return { deletedCount: 1 };
  });

  const server = app.listen(0);
  t.after(
    () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      })
  );
  await once(server, "listening");

  const baseUrl = `http://127.0.0.1:${server.address().port}/api/v1/comments`;
  const token = jwt.sign({ _id: ownerId }, process.env.ACCESS_TOKEN_SECRET);
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const createResponse = await fetch(`${baseUrl}/${videoId}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ content: "  first comment  " }),
  });
  assert.equal(createResponse.status, 201);
  assert.equal(storedComment.content, "first comment");

  const readResponse = await fetch(`${baseUrl}/${videoId}`, { headers });
  assert.equal(readResponse.status, 200);
  assert.equal(
    (await readResponse.json()).data.comments[0].content,
    "first comment"
  );

  const updateResponse = await fetch(`${baseUrl}/c/${commentId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ content: "updated comment" }),
  });
  assert.equal(updateResponse.status, 200);
  assert.equal(storedComment.content, "updated comment");

  const deleteResponse = await fetch(`${baseUrl}/c/${commentId}`, {
    method: "DELETE",
    headers,
  });
  assert.equal(deleteResponse.status, 200);
  assert.equal(storedComment, null);

  const emptyListResponse = await fetch(`${baseUrl}/${videoId}`, { headers });
  assert.equal(emptyListResponse.status, 200);
  assert.deepEqual((await emptyListResponse.json()).data.comments, []);
});
