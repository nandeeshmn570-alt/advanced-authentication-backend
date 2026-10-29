/**
 * Video controller: manages video upload, listing, updates, and publishing
 * workflows for the media API routes.
 */
import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOncloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, userId } = req.query;
  const filter = {};

  if (query) {
    if (typeof query !== "string" || query.length > 100) {
      throw new ApiError(
        400,
        "query must be a string of 100 characters or fewer"
      );
    }
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.title = { $regex: escapedQuery, $options: "i" };
  }
  if (userId) {
    if (!isValidObjectId(userId)) {
      throw new ApiError(400, "userId must be a valid ID");
    }
    filter.owner = userId;
  }

  const validLimit = Number(limit);
  const validPage = Number(page);
  if (
    !Number.isInteger(validPage) ||
    !Number.isInteger(validLimit) ||
    validPage < 1 ||
    validLimit < 1 ||
    validLimit > 100
  ) {
    throw new ApiError(
      400,
      "page and limit must be positive integers; limit cannot exceed 100"
    );
  }

  const videos = await Video.find(filter)
    .populate("owner", "username fullName avatar")
    .skip((validPage - 1) * validLimit)
    .limit(validLimit)
    .sort({ createdAt: -1 });

  const total = await Video.countDocuments(filter);
  const totalPages = Math.ceil(total / validLimit);

  res.status(200).json({
    success: true,
    data: videos,
    pagination: {
      total,
      totalPages,
      currentPage: validPage,
    },
  });
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description, duration } = req.body ?? {};
  const videoFile = req.files?.videoFile?.[0];
  const thumbnailFile = req.files?.thumbnail?.[0];

  if (
    typeof title !== "string" ||
    !title.trim() ||
    typeof description !== "string" ||
    !description.trim() ||
    !videoFile ||
    !thumbnailFile
  ) {
    throw new ApiError(
      400,
      "Title, description, video file and thumbnail are required"
    );
  }

  const parsedDuration = Number(duration);
  if (!Number.isFinite(parsedDuration) || parsedDuration < 0) {
    throw new ApiError(400, "duration must be a non-negative number");
  }
  if (!videoFile.mimetype?.startsWith("video/")) {
    throw new ApiError(400, "Invalid video file type");
  }
  if (!thumbnailFile.mimetype?.startsWith("image/")) {
    throw new ApiError(400, "Invalid thumbnail file type");
  }

  const videoUploadResult = await uploadOncloudinary(videoFile.path);
  const thumbnailUploadResult = await uploadOncloudinary(thumbnailFile.path);

  if (!videoUploadResult?.url || !thumbnailUploadResult?.url) {
    throw new ApiError(500, "Video upload failed");
  }

  const video = await Video.create({
    title: title.trim(),
    description: description.trim(),
    duration: parsedDuration,
    videoFile: videoUploadResult.url,
    thumbnail: thumbnailUploadResult.url,
    owner: req.user._id,
  });

  res
    .status(201)
    .json(new ApiResponse(201, video, "Video published successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId || !isValidObjectId(videoId)) {
    throw new ApiError(400, "videoId is required and should be valid");
  }

  const video = await Video.findById(videoId).populate(
    "owner",
    "username fullName avatar"
  );

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId || !isValidObjectId(videoId)) {
    throw new ApiError(400, "videoId is required and should be valid");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this video");
  }

  const { title, description } = req.body ?? {};
  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) {
      throw new ApiError(400, "title must be a non-empty string");
    }
    video.title = title.trim();
  }
  if (description !== undefined) {
    if (typeof description !== "string" || !description.trim()) {
      throw new ApiError(400, "description must be a non-empty string");
    }
    video.description = description.trim();
  }
  if (title === undefined && description === undefined) {
    throw new ApiError(400, "At least one video field must be provided");
  }

  await video.save();

  res
    .status(200)
    .json(new ApiResponse(200, video, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId || !isValidObjectId(videoId)) {
    throw new ApiError(400, "videoId is required and should be valid");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this video");
  }

  await Video.findByIdAndDelete(videoId);
  res
    .status(200)
    .json(new ApiResponse(200, null, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId || !isValidObjectId(videoId)) {
    throw new ApiError(400, "videoId is required and should be valid");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(
      403,
      "You are not authorized to toggle publish status of this video"
    );
  }

  video.isPublished = !video.isPublished;
  await video.save();
  res
    .status(200)
    .json(new ApiResponse(200, video, "Publish status toggled successfully"));
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
