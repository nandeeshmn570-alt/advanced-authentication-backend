import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";

import {
  registerUser,
  refreshAccessToken,
} from "../src/controllers/user.controller.js";
import {
  getVideoById,
  getAllVideos,
  publishAVideo,
  updateVideo,
} from "../src/controllers/video.controller.js";
import {
  toggleVideoLike,
  toggleCommentLike,
  toggleTweetLike,
} from "../src/controllers/likes.controller.js";
import {
  addVideoToPlaylist,
  createPlaylist,
  getPlaylistById,
} from "../src/controllers/playlist.controller.js";
import {
  getSubscribedChannels,
  getUserChannelSubscribers,
  toggleSubscription,
} from "../src/controllers/subscription.controller.js";
import {
  createTweet,
  updateTweet,
} from "../src/controllers/tweet.controller.js";
import {
  getChannelStats,
  getChannelVideos,
} from "../src/controllers/dashboard.controller.js";
import { Comment } from "../src/models/comment.model.js";
import { Like } from "../src/models/like.model.js";
import { Playlist } from "../src/models/playlist.model.js";
import { Subscription } from "../src/models/subscription.model.js";
import { Tweet } from "../src/models/tweet.model.js";
import { User } from "../src/models/user.model.js";
import { Video } from "../src/models/video.model.js";

const userId = "507f1f77bcf86cd799439011";
const otherUserId = "507f1f77bcf86cd799439012";
const targetId = "507f1f77bcf86cd799439013";

function invoke(
  handler,
  { params = {}, query = {}, body = {}, files, user } = {}
) {
  return new Promise((resolve) => {
    const response = {
      statusCode: undefined,
      body: undefined,
      cookies: [],
      status(statusCode) {
        this.statusCode = statusCode;
        return this;
      },
      cookie(name, value, options) {
        this.cookies.push({ name, value, options });
        return this;
      },
      json(body) {
        this.body = body;
        resolve({ response: this });
        return this;
      },
    };

    handler({ params, query, body, files, user }, response, (error) => {
      resolve({ response, error });
    });
  });
}

test("registerUser normalizes account fields, uploads avatar, and omits secrets", async (t) => {
  const uploaded = t.mock.method(cloudinary.uploader, "upload", async () => ({
    url: "https://media.example/avatar.jpg",
  }));
  const findOne = t.mock.method(User, "findOne", async () => null);
  const create = t.mock.method(User, "create", async (data) => ({
    _id: userId,
    ...data,
  }));
  t.mock.method(User, "findById", () => ({
    select: async () => ({
      _id: userId,
      username: "user",
      email: "user@example.com",
    }),
  }));

  const { response, error } = await invoke(registerUser, {
    body: {
      fullName: "  User Name ",
      email: " USER@Example.COM ",
      username: " User ",
      password: "pass word",
    },
    files: { avatar: [{ path: "avatar-test.jpg", mimetype: "image/jpeg" }] },
  });

  assert.equal(error, undefined);
  assert.equal(response.statusCode, 201);
  assert.equal(uploaded.mock.callCount(), 1);
  assert.equal(findOne.mock.calls[0].arguments[0].$or[0].username, "user");
  assert.deepEqual(create.mock.calls[0].arguments[0], {
    fullName: "User Name",
    avatar: "https://media.example/avatar.jpg",
    coverImage: "",
    email: "user@example.com",
    password: "pass word",
    username: "user",
  });
  assert.equal(response.body.data.password, undefined);
});

test("registerUser rejects invalid email, short password, and missing avatar", async (t) => {
  const findOne = t.mock.method(User, "findOne", async () => null);

  const invalidEmail = await invoke(registerUser, {
    body: {
      fullName: "User",
      email: "not-an-email",
      username: "user",
      password: "password",
    },
  });
  assert.equal(invalidEmail.error.statusCode, 400);

  const shortPassword = await invoke(registerUser, {
    body: {
      fullName: "User",
      email: "user@example.com",
      username: "user",
      password: "short",
    },
  });
  assert.equal(shortPassword.error.statusCode, 400);

  const missingAvatar = await invoke(registerUser, {
    body: {
      fullName: "User",
      email: "user@example.com",
      username: "user",
      password: "password",
    },
    files: {},
  });
  assert.equal(missingAvatar.error.statusCode, 400);
  assert.equal(findOne.mock.callCount(), 0);
});

test("refreshAccessToken rotates valid refresh tokens and rejects stale tokens", async (t) => {
  process.env.REFRESH_TOKEN_SECRET = "refresh-test-secret";
  const refreshToken = jwt.sign(
    { _id: userId },
    process.env.REFRESH_TOKEN_SECRET
  );
  const user = {
    _id: userId,
    refreshToken,
    generateAccessToken: () => "new-access-token",
    generateRefreshToken: () => "new-refresh-token",
    save: async () => {},
  };
  t.mock.method(User, "findById", async () => user);

  const { response, error } = await invoke(refreshAccessToken, {
    body: { refreshToken },
  });

  assert.equal(error, undefined);
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.data.accessToken, "new-access-token");
  assert.equal(response.cookies[0].options.httpOnly, true);
  assert.equal(response.cookies[0].options.sameSite, "strict");

  const staleToken = jwt.sign(
    { _id: userId },
    process.env.REFRESH_TOKEN_SECRET
  );
  const stale = await invoke(refreshAccessToken, {
    body: { refreshToken: staleToken },
  });
  assert.equal(stale.error.statusCode, 401);
});

test("getAllVideos validates bounded pagination and escapes search input", async (t) => {
  let appliedFilter;
  t.mock.method(Video, "find", (filter) => {
    appliedFilter = filter;
    return {
      populate() {
        return this;
      },
      skip() {
        return this;
      },
      limit() {
        return this;
      },
      sort() {
        return Promise.resolve([]);
      },
    };
  });
  t.mock.method(Video, "countDocuments", async () => 0);

  const { response, error } = await invoke(getAllVideos, {
    query: { query: "a.*", page: "2", limit: "5" },
  });
  assert.equal(error, undefined);
  assert.equal(response.statusCode, 200);
  assert.equal(appliedFilter.title.$regex, "a\\.\\*");

  const invalidLimit = await invoke(getAllVideos, {
    query: { limit: "101" },
  });
  assert.equal(invalidLimit.error.statusCode, 400);
});

test("publishAVideo rejects invalid duration and file media types before upload", async (t) => {
  const upload = t.mock.method(cloudinary.uploader, "upload", async () => ({
    url: "https://media.example/file",
  }));

  const { error } = await invoke(publishAVideo, {
    body: { title: "title", description: "description", duration: -1 },
    files: {
      videoFile: [{ path: "video.mp4", mimetype: "video/mp4" }],
      thumbnail: [{ path: "thumb.jpg", mimetype: "image/jpeg" }],
    },
    user: { _id: userId },
  });

  assert.equal(error.statusCode, 400);
  assert.equal(upload.mock.callCount(), 0);
});

test("publishAVideo uploads validated media and records the authenticated owner", async (t) => {
  let uploadCount = 0;
  const uploaded = t.mock.method(cloudinary.uploader, "upload", async () => ({
    url: `https://media.example/${++uploadCount}.mp4`,
  }));
  const create = t.mock.method(Video, "create", async (video) => video);

  const { response, error } = await invoke(publishAVideo, {
    body: { title: "  title ", description: " description ", duration: "12.5" },
    files: {
      videoFile: [{ path: "video.mp4", mimetype: "video/mp4" }],
      thumbnail: [{ path: "thumbnail.jpg", mimetype: "image/jpeg" }],
    },
    user: { _id: userId },
  });

  assert.equal(error, undefined);
  assert.equal(response.statusCode, 201);
  assert.equal(uploaded.mock.callCount(), 2);
  assert.deepEqual(create.mock.calls[0].arguments[0], {
    title: "title",
    description: "description",
    duration: 12.5,
    videoFile: "https://media.example/1.mp4",
    thumbnail: "https://media.example/2.mp4",
    owner: userId,
  });
});

test("updateVideo enforces ownership and rejects empty updates", async (t) => {
  const video = {
    owner: otherUserId,
    title: "title",
    description: "description",
    save: async function () {
      return this;
    },
  };
  t.mock.method(Video, "findById", async () => video);

  const unauthorized = await invoke(updateVideo, {
    params: { videoId: targetId },
    body: { title: "new title" },
    user: { _id: userId },
  });
  assert.equal(unauthorized.error.statusCode, 403);

  video.owner = userId;
  const emptyUpdate = await invoke(updateVideo, {
    params: { videoId: targetId },
    body: {},
    user: { _id: userId },
  });
  assert.equal(emptyUpdate.error.statusCode, 400);
});

test("video, comment, and tweet likes add and remove a user's like", async (t) => {
  t.mock.method(Video, "findById", async () => ({ _id: targetId }));
  t.mock.method(Comment, "findById", async () => ({ _id: targetId }));
  t.mock.method(Tweet, "findById", async () => ({ _id: targetId }));
  let existing = null;
  const findLike = t.mock.method(Like, "findOne", async () => existing);
  const createLike = t.mock.method(Like, "create", async (like) => like);
  t.mock.method(Like, "deleteOne", async () => ({ deletedCount: 1 }));

  for (const [handler, param] of [
    [toggleVideoLike, "videoId"],
    [toggleCommentLike, "commentId"],
    [toggleTweetLike, "tweetId"],
  ]) {
    const added = await invoke(handler, {
      params: { [param]: targetId },
      user: { _id: userId },
    });
    assert.equal(added.response.body.data.liked, true);
    existing = { _id: targetId };
    const removed = await invoke(handler, {
      params: { [param]: targetId },
      user: { _id: userId },
    });
    assert.equal(removed.response.body.data.liked, false);
    existing = null;
  }

  assert.equal(findLike.mock.callCount(), 6);
  assert.equal(createLike.mock.callCount(), 3);
});

test("playlist creation trims input and adding video checks ownership", async (t) => {
  const create = t.mock.method(Playlist, "create", async (data) => data);

  const created = await invoke(createPlaylist, {
    body: { name: "  Favorites ", description: "  Saved videos " },
    user: { _id: userId },
  });
  assert.equal(created.response.statusCode, 201);
  assert.equal(create.mock.calls[0].arguments[0].name, "Favorites");

  t.mock.method(Video, "findById", async () => ({ _id: targetId }));
  t.mock.method(Playlist, "findById", async () => ({
    owner: otherUserId,
  }));
  const update = t.mock.method(Playlist, "findByIdAndUpdate", async () => ({}));
  const forbidden = await invoke(addVideoToPlaylist, {
    params: { playlistId: targetId, videoId: otherUserId },
    user: { _id: userId },
  });
  assert.equal(forbidden.error.statusCode, 403);
  assert.equal(update.mock.callCount(), 0);
});

test("toggleSubscription prevents self-subscription and toggles existing subscriptions", async (t) => {
  t.mock.method(User, "findById", async () => ({ _id: targetId }));
  const existing = { deleteOne: async () => {} };
  t.mock.method(Subscription, "findOne", async () => existing);
  const create = t.mock.method(Subscription, "create", async (data) => data);

  const self = await invoke(toggleSubscription, {
    params: { channelId: userId },
    user: { _id: userId },
  });
  assert.equal(self.error.statusCode, 400);

  const unsubscribed = await invoke(toggleSubscription, {
    params: { channelId: targetId },
    user: { _id: userId },
  });
  assert.equal(unsubscribed.response.body.data.subscribed, false);
  assert.equal(create.mock.callCount(), 0);
});

test("tweets enforce length and ownership; dashboard reports channel stats", async (t) => {
  t.mock.method(User, "findById", async () => ({ _id: userId }));
  const create = t.mock.method(Tweet, "create", async (data) => data);

  const created = await invoke(createTweet, {
    body: { content: "  hello  " },
    user: { _id: userId },
  });
  assert.equal(created.response.statusCode, 201);
  assert.equal(create.mock.calls[0].arguments[0].content, "hello");

  const tooLong = await invoke(createTweet, {
    body: { content: "x".repeat(281) },
    user: { _id: userId },
  });
  assert.equal(tooLong.error.statusCode, 400);

  t.mock.method(Tweet, "findById", async () => ({
    owner: otherUserId,
    content: "old",
    save: async function () {
      return this;
    },
  }));
  const unauthorized = await invoke(updateTweet, {
    params: { tweetId: targetId },
    body: { content: "new" },
    user: { _id: userId },
  });
  assert.equal(unauthorized.error.statusCode, 403);

  t.mock.method(Video, "find", async () => [
    { _id: targetId, views: 7 },
    { _id: otherUserId, views: 3 },
  ]);
  t.mock.method(Subscription, "countDocuments", async () => 4);
  t.mock.method(Like, "countDocuments", async (filter) => {
    assert.deepEqual(filter.video.$in, [targetId, otherUserId]);
    return 2;
  });
  const stats = await invoke(getChannelStats, { user: { _id: userId } });
  assert.deepEqual(stats.response.body.data, {
    totalVideos: 2,
    totalViews: 10,
    totalSubscribers: 4,
    totalLikes: 2,
  });
});

test("resource endpoints reject malformed IDs and dashboard pagination", async () => {
  const invalidCases = [
    [getVideoById, { params: { videoId: "invalid" } }],
    [toggleVideoLike, { params: { videoId: "invalid" } }],
    [toggleCommentLike, { params: { commentId: "invalid" } }],
    [toggleTweetLike, { params: { tweetId: "invalid" } }],
    [getPlaylistById, { params: { playlistId: "invalid" } }],
    [
      toggleSubscription,
      { params: { channelId: "invalid" }, user: { _id: userId } },
    ],
    [getUserChannelSubscribers, { params: { channelId: "invalid" } }],
    [getSubscribedChannels, { params: { subscriberId: "invalid" } }],
    [
      updateTweet,
      {
        params: { tweetId: "invalid" },
        body: { content: "valid content" },
        user: { _id: userId },
      },
    ],
    [getChannelVideos, { query: { page: "0" }, user: { _id: userId } }],
  ];

  for (const [handler, request] of invalidCases) {
    const { error } = await invoke(handler, request);
    assert.equal(error.statusCode, 400);
  }
});
