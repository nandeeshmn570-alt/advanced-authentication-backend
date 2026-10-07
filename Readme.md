
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

Create a `.env` file in the project root with the following values:

```env
PORT=8000
CORS_ORIGIN=http://localhost:3000
MONGODB_URI=mongodb://127.0.0.1:27017
DB_NAME=advanced-authentication
ACCESS_TOKEN_SECRET=your_access_token_secret
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRY=10d
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Configure the `.env` file as described above
4. Start the development server:

```bash
npm run dev
```

The app will start on the configured port, defaulting to `8000`.

## API Highlights

### User endpoints
- `POST /api/v1/users/register`
- `POST /api/v1/users/login`
- `POST /api/v1/users/logout`
- `POST /api/v1/users/refresh-token`

### Video endpoints
- `POST /api/v1/videos/upload`
- `GET /api/v1/videos/`
- `GET /api/v1/videos/:videoId`
- `PATCH /api/v1/videos/:videoId`
- `DELETE /api/v1/videos/:videoId`

### Additional modules
- `GET /api/v1/healthcheck`
- `GET /api/v1/comments/:videoId`
- `POST /api/v1/comments/:videoId`
- `POST /api/v1/likes/videos/:videoId`
- `POST /api/v1/subscription/:channelId`
- `POST /api/v1/playlists/create-playlist`
- `GET /api/v1/dashboard/stats`

## Notes

This project is designed as a learning-oriented backend with strong patterns for production-style API development, including reusable controllers, middleware, database models, and structured error/response utilities.

## License

ISC
