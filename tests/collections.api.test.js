import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import jwt from "jsonwebtoken";

import { app } from "../src/app.js";
import { Playlist } from "../src/models/playlist.model.js";
import { Subscription } from "../src/models/subscription.model.js";
import { User } from "../src/models/user.model.js";
import { Video } from "../src/models/video.model.js";

const userId = "507f1f77bcf86cd799439011";
const channelId = "507f1f77bcf86cd799439012";
const playlistId = "507f1f77bcf86cd799439013";
const videoId = "507f1f77bcf86cd799439014";

test("playlist CRUD routes work through authenticated HTTP requests", async (t) => {
  process.env.ACCESS_TOKEN_SECRET = "playlist-api-test-secret";
  const user = { _id: userId, username: "playlist-owner" };
  let storedPlaylist = null;
  t.mock.method(User, "findById", () => ({
    select: async () => user,
  }));
  t.mock.method(Playlist, "create", async (data) => {
    storedPlaylist = {
      ...data,
      _id: playlistId,
      async save() {
        return this;
      },
    };
    return storedPlaylist;
  });
  t.mock.method(Playlist, "find", () => ({
    sort: async () => (storedPlaylist ? [storedPlaylist] : []),
  }));
  t.mock.method(Playlist, "findById", () => ({
    populate() {
      return this;
    },
    then(resolve, reject) {
      return Promise.resolve(storedPlaylist).then(resolve, reject);
    },
  }));
  t.mock.method(Playlist, "findByIdAndUpdate", async (id, update) => {
    if (!storedPlaylist || id !== playlistId) return null;
    if (
      update.$addToSet &&
      !storedPlaylist.videos.includes(update.$addToSet.videos)
    ) {
      storedPlaylist.videos.push(update.$addToSet.videos);
    }
    if (update.$pull) {
      storedPlaylist.videos = storedPlaylist.videos.filter(
        (id) => id !== update.$pull.videos
      );
    }
    return storedPlaylist;
  });
  t.mock.method(Playlist, "findByIdAndDelete", async () => {
    const deleted = storedPlaylist;
    storedPlaylist = null;
    return deleted;
  });
  t.mock.method(Video, "findById", async (id) =>
    id === videoId ? { _id: videoId } : null
  );

  const server = app.listen(0);
  t.after(
    () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      })
  );
  await once(server, "listening");
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/v1/playlists`;
  const token = jwt.sign({ _id: userId }, process.env.ACCESS_TOKEN_SECRET);
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const created = await fetch(`${baseUrl}/create-playlist`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: " Favorites ",
      description: " Saved videos ",
    }),
  });
  assert.equal(created.status, 201);
  assert.equal((await created.json()).data.name, "Favorites");

  const addedVideo = await fetch(`${baseUrl}/${playlistId}/videos/${videoId}`, {
    method: "POST",
    headers,
  });
  assert.equal(addedVideo.status, 200);
  assert.deepEqual(storedPlaylist.videos, [videoId]);

  const fetched = await fetch(`${baseUrl}/${playlistId}`, { headers });
  assert.equal(fetched.status, 200);
  assert.equal((await fetched.json()).data._id, playlistId);

  const updated = await fetch(`${baseUrl}/${playlistId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      name: "Updated",
      description: "Updated description",
    }),
  });
  assert.equal(updated.status, 200);
  assert.equal(storedPlaylist.name, "Updated");

  const removedVideo = await fetch(
    `${baseUrl}/${playlistId}/videos/${videoId}`,
    {
      method: "DELETE",
      headers,
    }
  );
  assert.equal(removedVideo.status, 200);
  assert.deepEqual(storedPlaylist.videos, []);

  const listed = await fetch(`${baseUrl}/user/${userId}`, { headers });
  assert.equal(listed.status, 200);
  assert.equal((await listed.json()).data.length, 1);

  const deleted = await fetch(`${baseUrl}/${playlistId}`, {
    method: "DELETE",
    headers,
  });
  assert.equal(deleted.status, 200);
  assert.equal(storedPlaylist, null);
});

test("subscription endpoints create/remove subscriptions and list both directions", async (t) => {
  process.env.ACCESS_TOKEN_SECRET = "subscription-api-test-secret";
  const user = { _id: userId };
  const channel = { _id: channelId };
  const asUserQuery = (result) => ({
    select: async () => result,
    then(resolve, reject) {
      return Promise.resolve(result).then(resolve, reject);
    },
  });
  const storedSubscriptions = [];
  t.mock.method(User, "findById", (id) => {
    if (id === userId) return asUserQuery(user);
    if (id === channelId) return asUserQuery(channel);
    return asUserQuery(null);
  });
  t.mock.method(
    Subscription,
    "findOne",
    async (filter) =>
      storedSubscriptions.find(
        (subscription) =>
          subscription.subscriber === filter.subscriber &&
          subscription.channel === filter.channel
      ) ?? null
  );
  t.mock.method(Subscription, "create", async (subscription) => {
    const stored = {
      ...subscription,
      async deleteOne() {
        const index = storedSubscriptions.indexOf(stored);
        if (index !== -1) storedSubscriptions.splice(index, 1);
      },
    };
    storedSubscriptions.push(stored);
    return stored;
  });
  t.mock.method(Subscription, "find", (filter) => ({
    populate: async () =>
      storedSubscriptions.filter((subscription) =>
        Object.entries(filter).every(
          ([key, value]) => subscription[key] === value
        )
      ),
  }));

  const server = app.listen(0);
  t.after(
    () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      })
  );
  await once(server, "listening");
  const baseUrl = `http://127.0.0.1:${
    server.address().port
  }/api/v1/subscription`;
  const token = jwt.sign({ _id: userId }, process.env.ACCESS_TOKEN_SECRET);
  const headers = { Authorization: `Bearer ${token}` };

  const subscribe = await fetch(`${baseUrl}/${channelId}`, {
    method: "POST",
    headers,
  });
  assert.equal(subscribe.status, 201);
  assert.equal((await subscribe.json()).data.subscribed, true);

  const subscribers = await fetch(
    `${baseUrl}/channel/${channelId}/subscribers`,
    { headers }
  );
  assert.equal(subscribers.status, 200);
  assert.equal((await subscribers.json()).data.length, 1);

  const channels = await fetch(`${baseUrl}/user/${userId}/channels`, {
    headers,
  });
  assert.equal(channels.status, 200);
  assert.equal((await channels.json()).data.length, 1);

  const unsubscribe = await fetch(`${baseUrl}/${channelId}`, {
    method: "POST",
    headers,
  });
  assert.equal(unsubscribe.status, 200);
  assert.equal((await unsubscribe.json()).data.subscribed, false);
  assert.equal(storedSubscriptions.length, 0);
});
