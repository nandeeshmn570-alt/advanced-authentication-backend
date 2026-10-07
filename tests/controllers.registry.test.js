import test from 'node:test';
import assert from 'node:assert/strict';

import { app } from '../src/app.js';
import userRoutes from '../src/routes/user.routes.js';
import healthcheckRoutes from '../src/routes/healthcheck.routes.js';
import tweetRoutes from '../src/routes/tweet.routes.js';
import subscriptionRoutes from '../src/routes/subscription.routes.js';
import videoRoutes from '../src/routes/video.routes.js';
import commentRoutes from '../src/routes/comment.routes.js';
import likeRoutes from '../src/routes/like.routes.js';
import playlistRoutes from '../src/routes/playlist.routes.js';
import dashboardRoutes from '../src/routes/dashboard.routes.js';

const routeModules = {
  user: userRoutes,
  healthcheck: healthcheckRoutes,
  tweet: tweetRoutes,
  subscription: subscriptionRoutes,
  video: videoRoutes,
  comment: commentRoutes,
  like: likeRoutes,
  playlist: playlistRoutes,
  dashboard: dashboardRoutes
};

test('all route modules import successfully', () => {
  for (const [name, router] of Object.entries(routeModules)) {
    assert.ok(router, `${name} route module should be defined`);
    assert.equal(typeof router, 'function', `${name} route module should export a router`);
  }
});

test('application mounts the expected API prefixes', () => {
  const expectedPrefixes = [
    '/api/v1/users',
    '/api/v1/healthcheck',
    '/api/v1/tweets',
    '/api/v1/playlists',
    '/api/v1/subscriptions',
    '/api/v1/videos',
    '/api/v1/comments',
    '/api/v1/likes',
    '/api/v1/dashboard'
  ];

  const stack = app._router?.stack ?? [];

  for (const prefix of expectedPrefixes) {
    const isMounted = stack.some((layer) => {
      return layer?.regexp && typeof layer.regexp.test === 'function' && layer.regexp.test(prefix);
    });

    assert.equal(isMounted, true, `app should mount ${prefix}`);
  }
});
