# Advanced Authentication Backend

A YouTube-inspired backend API for a video hosting platform built with Node.js, Express, MongoDB, and Mongoose. The project focuses on secure user authentication, media uploads, social interactions, and content management features typically found in modern video platforms.

## Overview

This backend provides a robust foundation for a video-sharing application with:

- User registration and authentication
- JWT-based access and refresh token handling
- Password hashing with bcrypt
- Cloudinary-powered image and video uploads
- Video publishing, listing, updates, and deletion
- Likes, comments, playlists, subscriptions, and tweets
- Dashboard statistics for channel owners
- Health check and structured API responses

## Tech Stack

- Node.js
- Express.js
- MongoDB + Mongoose
- JWT (JSON Web Tokens)
- bcrypt
- Cloudinary
- Multer
- Cookie parser
- CORS
- dotenv

## Core Features

### Authentication and user management

- User registration with avatar and cover image upload
- Login/logout endpoints
- Refresh token flow for renewed access
- Protected routes using JWT verification middleware
- Secure user profile and password handling

### Video platform features

- Upload videos with thumbnails
- List and search videos with pagination
- Fetch individual video details
- Update or delete owned videos
- Toggle publish/unpublish status
- Track owner and video metadata

### Social and engagement features

- Like videos, comments, and tweets
- Add, update, and delete comments on videos
- Create and manage playlists
- Subscribe/unsubscribe behavior
- User tweet creation and management
- Dashboard stats for channel activity

### Media handling

- File validation for uploads
- Cloudinary integration for storage
- Support for image and video media processing

## Project Structure

```bash
advanced-authentication-backend/
├── src/
│   ├── app.js
│   ├── index.js
│   ├── constants.js
│   ├── controllers/
│   │   ├── user.controller.js
│   │   ├── video.controller.js
│   │   ├── comment.controller.js
│   │   ├── likes.controller.js
│   │   ├── playlist.controller.js
│   │   ├── subscription.controller.js
│   │   ├── tweet.controller.js
│   │   ├── dashboard.controller.js
│   │   └── healthcheck.controller.js
│   ├── db/
│   │   └── index.js
│   ├── middlewares/
│   │   ├── auth.middleware.js
│   │   └── multer.middleware.js
│   ├── models/
│   │   ├── user.model.js
│   │   ├── video.model.js
│   │   ├── comment.model.js
│   │   ├── like.model.js
│   │   ├── playlist.model.js
│   │   ├── subscription.model.js
│   │   ├── tweeet.model.js
│   │   └── ...
│   ├── routes/
│   │   ├── user.routes.js
│   │   ├── video.routes.js
│   │   ├── comment.routes.js
│   │   ├── like.routes.js
│   │   ├── playlist.routes.js
│   │   ├── subscription.routes.js
│   │   ├── tweet.routes.js
│   │   ├── dashboard.routes.js
│   │   └── healthcheck.routes.js
│   └── utils/
│       ├── ApiError.js
│       ├── ApiResponse.js
│       ├── asyncHandler.js
│       └── cloudinary.js
├── .gitignore
├── .prettierrc
├── package.json
├── package-lock.json
├── Readme.md
└── .env
```

## Environment Variables

Copy `.env.example` to `.env` and set values appropriate for your environment:

```env
PORT=8000
CORS_ORIGIN=http://localhost:3000
MONGODB_URI=mongodb://127.0.0.1:27017
ACCESS_TOKEN_SECRET=replace-with-a-long-random-secret
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=replace-with-another-long-random-secret
REFRESH_TOKEN_EXPIRY=10d
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

`DB_NAME` is currently fixed to `videotube` in `src/constants.js`; `MONGODB_URI`
should be the MongoDB server URI without a database path. In production, use
separate random token secrets of at least 32 characters, configure all
Cloudinary credentials, and provide comma-separated, explicit HTTP(S) origins in
`CORS_ORIGIN`. Never commit `.env` or put production credentials in an image.

## Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Copy `.env.example` to `.env` and configure it as described above
4. Start the development server:

```bash
npm run dev
```

The app will start on the configured port, defaulting to `8000`.

## Deployment

Build and run the production container:

```bash
docker build -t advanced-authentication-backend .
docker run --name advanced-authentication-backend \
  --env-file .env \
  -p 8000:8000 \
  advanced-authentication-backend
```

Provide a production `.env` securely at deployment time. The server validates
required configuration before connecting to MongoDB, uses a non-root container
user, and exposes `GET /api/v1/healthcheck/` for health probes. The CI workflow
runs unit/API tests, MongoDB integration tests, and a Docker image build. The
`MONGODB_URI` must resolve to a database reachable from the container.

## Testing

Run the automated test suite with:

```bash
npm test
```

The suite covers authentication, comment APIs, feature-controller validation,
and consistent HTTP error responses. Most controller tests use mocked model
calls. MongoDB persistence and index integration tests use a separate database
and are skipped locally unless `TEST_MONGODB_URI` points to a dedicated
database whose name ends in `_test` or `-test`:

```bash
$env:TEST_MONGODB_URI="mongodb://127.0.0.1:27017/videotube_test"
npm run test:integration
```

The integration tests drop only that explicitly configured test database after
the suite completes. GitHub Actions starts an isolated MongoDB service and runs
these tests on pushes and pull requests.

## API Highlights

### User endpoints

- `POST /api/v1/users/register`
- `POST /api/v1/users/login`
- `POST /api/v1/users/logout`
- `POST /api/v1/users/refresh-token`
- `GET /api/v1/users/current-user`
- `PATCH /api/v1/users/change-password`
- `PATCH /api/v1/users/update-account`
- `PATCH /api/v1/users/avatar`
- `PATCH /api/v1/users/cover-image`
- `GET /api/v1/users/channel/:username`
- `GET /api/v1/users/history`

### Video endpoints

- `POST /api/v1/videos/upload`
- `GET /api/v1/videos/`
- `GET /api/v1/videos/:videoId`
- `PATCH /api/v1/videos/:videoId`
- `DELETE /api/v1/videos/:videoId`
- `PATCH /api/v1/videos/:videoId/publish`

### Additional modules

- `GET /api/v1/healthcheck`
- `GET /api/v1/comments/:videoId`
- `POST /api/v1/comments/:videoId`
- `PATCH /api/v1/comments/c/:commentId`
- `DELETE /api/v1/comments/c/:commentId`
- `POST /api/v1/likes/videos/:videoId`
- `POST /api/v1/likes/comments/:commentId`
- `POST /api/v1/likes/tweets/:tweetId`
- `GET /api/v1/likes/videos`
- `POST /api/v1/subscription/:channelId`
- `GET /api/v1/subscription/channel/:channelId/subscribers`
- `GET /api/v1/subscription/user/:subscriberId/channels`
- `POST /api/v1/tweets/create-tweet`
- `GET /api/v1/tweets/user-tweets`
- `PATCH /api/v1/tweets/:tweetId`
- `DELETE /api/v1/tweets/:tweetId`
- `POST /api/v1/playlists/create-playlist`
- `GET /api/v1/playlists/user/:userId`
- `GET /api/v1/playlists/:playlistId`
- `PATCH /api/v1/playlists/:playlistId`
- `DELETE /api/v1/playlists/:playlistId`
- `POST /api/v1/playlists/:playlistId/videos/:videoId`
- `DELETE /api/v1/playlists/:playlistId/videos/:videoId`
- `GET /api/v1/dashboard/videos`
- `GET /api/v1/dashboard/stats`

All routes other than health check are currently protected by JWT middleware
where configured. Media uploads accept image/video MIME types and are limited to
50 MB per file.

## Notes

This project is designed as a learning-oriented backend with strong patterns for production-style API development, including reusable controllers, middleware, database models, and structured error/response utilities.

## License

ISC
