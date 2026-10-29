/**
 * Comment controller: handles comments for videos, including creation,
 * listing, updates, and deletion for the comment API routes.
 */
import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 10);

  if (
    !Number.isInteger(page) ||
    !Number.isInteger(limit) ||
    page < 1 ||
    limit < 1 ||
    limit > 100
  ) {
    throw new ApiError(400, "Invalid page or limit");
  }
  if (!videoId || !mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "videoId is required and should be valid");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const skip = (page - 1) * limit;

  const comments = await Comment.find({ video: video._id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("owner", "username fullName avatar");

  const totalComments = await Comment.countDocuments({
    video: video._id,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        comments,
        pagination: {
          page,
          limit,
          skip,
          totalComments,
          totalPages: Math.ceil(totalComments / limit),
        },
      },
      "comments fetched successfully"
    )
  );
});

const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { content } = req.body ?? {};

  if (!videoId || !mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "videoId is required and should be valid");
  }

  if (typeof content !== "string" || !content.trim()) {
    throw new ApiError(400, "Comment content is required");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const commentedUser = await Comment.create({
    video: video._id,
    content: content.trim(),
    owner: req.user._id,
  });

  if (!commentedUser) {
    throw new ApiError(500, "Failed to add comment");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, commentedUser, "Comment added successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  const { content } = req.body ?? {};
  const commentId = req.params.commentId;

  if (typeof content !== "string" || !content.trim()) {
    throw new ApiError(400, "Comment content is required");
  }

  if (!commentId || !mongoose.isValidObjectId(commentId)) {
    throw new ApiError(400, "commentId is required and should be valid");
  }

  const oldComment = await Comment.findById(commentId);

  if (!oldComment) {
    throw new ApiError(404, "No old comment present");
  }

  if (oldComment.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "owner does not match");
  }

  oldComment.content = content.trim();
  const response = await oldComment.save();

  return res
    .status(200)
    .json(new ApiResponse(200, response, "comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  const commentId = req.params.commentId;

  if (!commentId || !mongoose.isValidObjectId(commentId)) {
    throw new ApiError(400, "commentId is required and should be valid");
  }

  const oldComment = await Comment.findById(commentId);

  if (!oldComment) {
    throw new ApiError(404, "Comment not found");
  }

  if (oldComment.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this comment");
  }

  const response = await Comment.deleteOne({
    _id: commentId,
  });

  if (response.deletedCount !== 1) {
    throw new ApiError(500, "Failed to delete comment");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, response, "Comment deleted successfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
