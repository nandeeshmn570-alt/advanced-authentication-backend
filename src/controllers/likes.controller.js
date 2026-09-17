import  {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {Video} from "../models/video.model.js"
import {Comment} from "../models/comment.model.js"
import {Tweet} from "../models/tweet.model.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video

    if(!videoId || !isValidObjectId(videoId)){
        throw new ApiError(400,"videoId is required and should be valid")
    }

   const video = await Video.findById(videoId)
   if(!video){
    throw new ApiError(404,"video not found")
   }

   const existingLike = await Like.findOne({
    video:videoId,
    likedBy:req.user._id
   })
   if(existingLike){
    await Like.deleteOne({
        video:videoId,
        likedBy:req.user._id
    })

    return res
        .status(200)
        .json(new ApiResponse(200, { liked: false }, "Like removed successfully"))

   } else {
    await Like.create({
        video:videoId,
        likedBy:req.user._id
    })
    return res
        .status(200)
        .json(new ApiResponse(200, { liked: true }, "Like added successfully"))
   }




})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment
    
    if(!commentId || !isValidObjectId(commentId)){
        throw new ApiError(400,"commentId is required and should be valid")
    }


    const comment = await Comment.findById(commentId)
    if(!comment){
        throw new ApiError(404,"comment not found")
    }
    const existingLike = await Like.findOne({
        comment:commentId,
        likedBy:req.user._id
    })

    if(existingLike){
        await Like.deleteOne({
            comment:commentId,
            likedBy:req.user._id
        })

        return res
            .status(200)
            .json(new ApiResponse(200, { liked: false }, "Like removed successfully"))

    } else {
        await Like.create({
            comment:commentId,
            likedBy:req.user._id
        })
        return res
            .status(200)
            .json(new ApiResponse(200, { liked: true }, "Like added successfully"))
    }

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet
    if(!tweetId || !isValidObjectId(tweetId)){
        throw new ApiError(400,"tweetId is required and should be valid")
    }
    const tweet = await Tweet.findById(tweetId)
    if(!tweet){
        throw new ApiError(404,"tweet not found")
    }
    const existingLike = await Like.findOne({
        tweet:tweetId,
        likedBy:req.user._id
    })
    if(existingLike){
        await Like.deleteOne({
            tweet:tweetId,
            likedBy:req.user._id
        })

        return res
            .status(200)
            .json(new ApiResponse(200, { liked: false }, "Like removed successfully"))

    } else {
        await Like.create({
            tweet:tweetId,
            likedBy:req.user._id
        })
        return res
            .status(200)
            .json(new ApiResponse(200, { liked: true }, "Like added successfully"))
    }
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    const likedVideos = await Like.find({
        likedBy: req.user._id,
        video: { $exists: true, $ne: null }
    })
        .populate("video")
        .then(likes => likes.map(like => like.video).filter(Boolean))
   
    return res
        .status(200)
        .json(new ApiResponse(200, likedVideos, "Liked videos fetched successfully"))


    
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}