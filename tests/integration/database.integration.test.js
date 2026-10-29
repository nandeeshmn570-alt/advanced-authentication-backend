import test, { after, before, beforeEach, describe } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import { Comment } from "../../src/models/comment.model.js";
import { Like } from "../../src/models/like.model.js";
import { Playlist } from "../../src/models/playlist.model.js";
import { Subscription } from "../../src/models/subscription.model.js";
import { Tweet } from "../../src/models/tweet.model.js";
import { User } from "../../src/models/user.model.js";
import { Video } from "../../src/models/video.model.js";

const mongoUri = process.env.TEST_MONGODB_URI;

describe(
  "MongoDB persistence and indexes",
  {
    skip: !mongoUri && "Set TEST_MONGODB_URI to run MongoDB integration tests",
  },
  () => {
    before(async () => {
      const databaseName = new URL(mongoUri).pathname.slice(1).split("?")[0];
      if (!/[_-]test$/i.test(databaseName)) {
        throw new Error(
          "TEST_MONGODB_URI database name must end in '_test' or '-test'"
        );
      }

      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
      await Promise.all([
        User.init(),
        Video.init(),
        Comment.init(),
        Like.init(),
        Playlist.init(),
        Subscription.init(),
        Tweet.init(),
      ]);
    });

    beforeEach(async () => {
      await Promise.all(
        [User, Video, Comment, Like, Playlist, Subscription, Tweet].map(
          (model) => model.deleteMany({})
        )
      );
    });

    after(async () => {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.dropDatabase();
      }
      await mongoose.disconnect();
    });

    test("persists users and videos with unique user indexes", async () => {
      const user = await User.create({
        username: "db-test-user",
        email: "db-test@example.com",
        fullName: "Database Test",
        avatar: "https://example.com/avatar.jpg",
        password: "password123",
      });
      const video = await Video.create({
        title: "Persisted video",
        description: "Test persistence",
        duration: 12,
        videoFile: "https://example.com/video.mp4",
        thumbnail: "https://example.com/thumb.jpg",
        owner: user._id,
      });

      const storedUser = await User.findById(user._id);
      const storedVideo = await Video.findById(video._id);
      const userIndexes = await User.collection.indexes();

      assert.equal(storedUser.username, "db-test-user");
      assert.notEqual(storedUser.password, "password123");
      assert.equal(storedVideo.owner.toString(), user._id.toString());
      assert.ok(
        userIndexes.some((index) => index.unique && index.key.email === 1)
      );
      assert.ok(
        userIndexes.some((index) => index.unique && index.key.username === 1)
      );
    });

    test("enforces unique subscriptions and duplicate-like indexes", async () => {
      const [subscriber, channel, video] = await Promise.all([
        User.create({
          username: "subscriber",
          email: "subscriber@example.com",
          fullName: "Subscriber",
          avatar: "https://example.com/a.jpg",
          password: "password123",
        }),
        User.create({
          username: "channel",
          email: "channel@example.com",
          fullName: "Channel",
          avatar: "https://example.com/b.jpg",
          password: "password123",
        }),
        Video.create({
          title: "Liked video",
          description: "Test video",
          duration: 1,
          videoFile: "https://example.com/video.mp4",
          thumbnail: "https://example.com/thumb.jpg",
          owner: new mongoose.Types.ObjectId(),
        }),
      ]);

      await Subscription.create({
        subscriber: subscriber._id,
        channel: channel._id,
      });
      await assert.rejects(
        Subscription.create({
          subscriber: subscriber._id,
          channel: channel._id,
        }),
        { code: 11000 }
      );

      await Like.create({ likedBy: subscriber._id, video: video._id });
      await assert.rejects(
        Like.create({ likedBy: subscriber._id, video: video._id }),
        { code: 11000 }
      );
      await assert.rejects(
        new Like({ likedBy: subscriber._id }).validate(),
        /exactly one video, comment, or tweet/
      );
    });

    test("isolates each test and cleans up its data", async () => {
      assert.equal(await User.countDocuments(), 0);
      assert.equal(await Video.countDocuments(), 0);
      assert.equal(await Like.countDocuments(), 0);
      assert.equal(await Subscription.countDocuments(), 0);
    });
  }
);
