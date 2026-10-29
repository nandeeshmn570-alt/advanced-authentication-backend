import test from "node:test";
import assert from "node:assert/strict";

import {
  addComment,
  deleteComment,
  getVideoComments,
  updateComment,
} from "../src/controllers/comment.controller.js";
import { Comment } from "../src/models/comment.model.js";
import { Video } from "../src/models/video.model.js";

const videoId = "507f1f77bcf86cd799439011";
const commentId = "507f1f77bcf86cd799439012";
const ownerId = "507f1f77bcf86cd799439013";
const otherOwnerId = "507f1f77bcf86cd799439014";

function invoke(handler, { params = {}, query = {}, body = {}, user } = {}) {
  return new Promise((resolve) => {
    const response = {
      statusCode: undefined,
      body: undefined,
      status(statusCode) {
        this.statusCode = statusCode;
        return this;
      },
      json(body) {
        this.body = body;
        resolve({ response: this });
        return this;
      },
    };

    handler({ params, query, body, user }, response, (error) => {
      resolve({ response, error });
    });
  });
}

test("addComment trims content and associates the authenticated owner", async (t) => {
  t.mock.method(Video, "findById", async (id) => ({ _id: id }));
  const create = t.mock.method(Comment, "create", async (comment) => comment);

  const { response, error } = await invoke(addComment, {
    params: { videoId },
    body: { content: "  hello  " },
    user: { _id: ownerId },
  });

  assert.equal(error, undefined);
  assert.equal(response.statusCode, 201);
  assert.deepEqual(create.mock.calls[0].arguments[0], {
    video: videoId,
    content: "hello",
    owner: ownerId,
  });
  assert.equal(response.body.data.content, "hello");
});

test("addComment rejects invalid IDs and non-string or blank content", async (t) => {
  const findVideo = t.mock.method(Video, "findById", async () => ({
    _id: videoId,
  }));

  const invalidIdResult = await invoke(addComment, {
    params: { videoId: "invalid" },
    body: { content: "hello" },
    user: { _id: ownerId },
  });
  assert.equal(invalidIdResult.error.statusCode, 400);

  const invalidContentResult = await invoke(addComment, {
    params: { videoId },
    body: { content: { text: "hello" } },
    user: { _id: ownerId },
  });
  assert.equal(invalidContentResult.error.statusCode, 400);

  const missingBodyResult = await invoke(addComment, {
    params: { videoId },
    body: null,
    user: { _id: ownerId },
  });
  assert.equal(missingBodyResult.error.statusCode, 400);
  assert.equal(findVideo.mock.callCount(), 0);
});

test("addComment returns not found when the video does not exist", async (t) => {
  t.mock.method(Video, "findById", async () => null);
  const create = t.mock.method(Comment, "create", async () => ({}));

  const { error } = await invoke(addComment, {
    params: { videoId },
    body: { content: "hello" },
    user: { _id: ownerId },
  });

  assert.equal(error.statusCode, 404);
  assert.equal(create.mock.callCount(), 0);
});

test("getVideoComments applies pagination and returns an empty page successfully", async (t) => {
  const comments = [];
  t.mock.method(Video, "findById", async (id) => ({ _id: id }));
  t.mock.method(Comment, "find", (filter) => {
    assert.deepEqual(filter, { video: videoId });
    return {
      sort(sort) {
        assert.deepEqual(sort, { createdAt: -1 });
        return this;
      },
      skip(skip) {
        assert.equal(skip, 4);
        return this;
      },
      limit(limit) {
        assert.equal(limit, 2);
        return this;
      },
      populate(path, fields) {
        assert.equal(path, "owner");
        assert.equal(fields, "username fullName avatar");
        return Promise.resolve(comments);
      },
    };
  });
  t.mock.method(Comment, "countDocuments", async () => 3);

  const { response, error } = await invoke(getVideoComments, {
    params: { videoId },
    query: { page: "3", limit: "2" },
  });

  assert.equal(error, undefined);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body.data.pagination, {
    page: 3,
    limit: 2,
    skip: 4,
    totalComments: 3,
    totalPages: 2,
  });
  assert.deepEqual(response.body.data.comments, []);
});

test("getVideoComments rejects invalid pagination and IDs", async (t) => {
  const findVideo = t.mock.method(Video, "findById", async () => ({
    _id: videoId,
  }));

  const invalidPagination = await invoke(getVideoComments, {
    params: { videoId },
    query: { limit: "101" },
  });
  assert.equal(invalidPagination.error.statusCode, 400);

  const invalidId = await invoke(getVideoComments, {
    params: { videoId: "invalid" },
  });
  assert.equal(invalidId.error.statusCode, 400);
  assert.equal(findVideo.mock.callCount(), 0);
});

test("updateComment changes content only for its owner", async (t) => {
  const comment = {
    _id: commentId,
    owner: ownerId,
    content: "before",
    async save() {
      return this;
    },
  };
  t.mock.method(Comment, "findById", async () => comment);

  const { response, error } = await invoke(updateComment, {
    params: { commentId },
    body: { content: "  after  " },
    user: { _id: ownerId },
  });

  assert.equal(error, undefined);
  assert.equal(response.statusCode, 200);
  assert.equal(comment.content, "after");
});

test("updateComment rejects non-owners and invalid IDs", async (t) => {
  t.mock.method(Comment, "findById", async () => ({
    owner: ownerId,
    content: "unchanged",
    save: async function () {
      return this;
    },
  }));

  const unauthorized = await invoke(updateComment, {
    params: { commentId },
    body: { content: "after" },
    user: { _id: otherOwnerId },
  });
  assert.equal(unauthorized.error.statusCode, 403);

  const invalidId = await invoke(updateComment, {
    params: { commentId: "invalid" },
    body: { content: "after" },
    user: { _id: ownerId },
  });
  assert.equal(invalidId.error.statusCode, 400);
});

test("deleteComment checks ownership and confirms a successful deletion", async (t) => {
  t.mock.method(Comment, "findById", async () => ({ owner: ownerId }));
  const deleteOne = t.mock.method(Comment, "deleteOne", async () => ({
    deletedCount: 1,
  }));

  const { response, error } = await invoke(deleteComment, {
    params: { commentId },
    user: { _id: ownerId },
  });

  assert.equal(error, undefined);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(deleteOne.mock.calls[0].arguments[0], { _id: commentId });
});

test("deleteComment rejects non-owners and failed deletion results", async (t) => {
  t.mock.method(Comment, "findById", async () => ({ owner: ownerId }));
  t.mock.method(Comment, "deleteOne", async () => ({ deletedCount: 0 }));

  const unauthorized = await invoke(deleteComment, {
    params: { commentId },
    user: { _id: otherOwnerId },
  });
  assert.equal(unauthorized.error.statusCode, 403);

  const failedDeletion = await invoke(deleteComment, {
    params: { commentId },
    user: { _id: ownerId },
  });
  assert.equal(failedDeletion.error.statusCode, 500);
});
