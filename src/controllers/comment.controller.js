
import mongoose from "mongoose"
import { Comment } from "../models/comment.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"


const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const { videoId } = req.params
    const page = Number(req.query.page ? req.query.page : 1)
    const limit = Number(req.query.limit ? req.query.limit : 10)

    if (
        !Number.isInteger(page) ||
        !Number.isInteger(limit) ||
        page < 1 ||
        limit < 1 ||
        limit > 100
    ) {
        throw new ApiError(400, "Invalid page or limit");
    }
    if (!videoId) {
        throw new ApiError(400, "videoId  is required")
    }

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "videoId is not valid")
    }
    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "video not found")
    }
    if (!Number.isInteger(page) || !Number.isInteger(limit) || page < 1 || limit < 1) {
        throw new ApiError(400, "page and limit should be greater than 0")
    }
    const skip = (page - 1) * limit

    const comments = await Comment.find({ video: video._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("owner", "username fullName avatar")


    const totalComments = await Comment.countDocuments({
        video: video._id
    })


    if (comments.length === 0 && page > 1) {
        throw new ApiError(404, "No comments found")
    }
    return res
        .status(200)
        .json(new ApiResponse(200, {
            comments,
            pagination: {
                page,
                limit,
                skip,
                totalComments,
                totalPages: Math.ceil(totalComments / limit)
            }
        }, "comments fetched successfully"))
})

const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { content } = req.body

    if (!videoId) {
        throw new ApiError(400, "videoId is required")
    }

    if (!content || !content.trim()) {
        throw new ApiError(400, "message is required")
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "video not found")
    }
    const commentedUser = await Comment.create({
        video: videoId,
        content: content.trim(),
        owner: req.user._id
    })

    if (!commentedUser) {
        throw new ApiError(400, "something happend while adding comment")
    }

    return res
        .status(201)
        .json(new ApiResponse(201, commentedUser, "Comment added successfully"))
})

const updateComment = asyncHandler(async (req, res) => {
    const { content } = req.body
    const commentId = req.params.commentId

    if (!content) {
        throw new ApiError(400, "The content required for updation")
    }

    if (!commentId) {
        throw new ApiError(400, "CommentId required")
    }
    const oldComment = await Comment.findById(commentId)

    if (!oldComment) {
        throw new ApiError(404, "No old comment present")
    }
    if (!(oldComment.owner.toString() == req.user._id.toString())) {
        throw new ApiError(403, "owner does not match")
    }

    oldComment.content = content.trim()
    const response = await oldComment.save()

    if (response.deleteCount !== 1) {
        throw new ApiError(404, "Error happened in updating comment")

    }
    return res
        .status(202)
        .json(new ApiResponse(202, response, "comment updated successfully"))



})

const deleteComment = asyncHandler(async (req, res) => {
    const commentId = req.params.commentId

    if (!commentId) {
        throw new ApiError(404, "No commentId provided")
    }
    const oldComment = await Comment.findById(commentId)

    if (!oldComment) {
        throw new ApiError(404, "No old comment found")
    }
    if (!(oldComment.owner.toString() == req.user._id.toString())) {
        throw new ApiError(403, "No user found")
    }

    const response = await Comment.deleteOne(
        {
            _id: commentId
        }
    )

    if (!response) {
        throw new ApiError(404, "Fails to delete the comment")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, response, "Comment deleted successfully"))

})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}