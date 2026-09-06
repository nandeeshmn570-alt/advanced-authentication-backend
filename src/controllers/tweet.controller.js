import mongoose, { isValidObjectId } from "mongoose"
import { Tweet } from "../models/tweet.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { response } from "express"

const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body
    const userId  = req.user._id
    if (!userId || !isValidObjectId(userId)) {
        throw new ApiError(400, "userId is required and should be valid")
    }

    if (typeof content !== "string") {
        throw new ApiError(400, "content should be a string")
    }
    if (!content || content.trim() === "") {
        throw new ApiError(400, "content field is required")
    }

    const user = await User.findById(userId)
    if (!user) {
        throw new ApiError(404, "user not found")
    }
    if (content.length > 280) {
        throw new ApiError(400, "content should not exceed 280 characters")
    }
    const tweet = await Tweet.create({
        content: content.trim(),
        owner: userId
    })
    if (!tweet) {
        throw new ApiError(500, "tweet creation failed")
    }

    return res
        .status(201)
        .json(new ApiResponse(201, tweet, "tweet created  successfully"))
})

const getUserTweets = asyncHandler(async (req, res) => {
       const user = req.user

       if(!user){
        throw new ApiError(404,"failed to fetch user")
       }

       const tweets = await Tweet.find({
        owner:req.user._id 
       }).sort({createdAt:-1})

       return res
               .status(200)
               .json(new ApiResponse(200,tweets,"user tweets fetched successfully"))
})

const updateTweet = asyncHandler(async (req, res) => {
    
    const {tweetId}= req.params
    const {content}= req.body
    if(typeof content !=="string"){
        throw new ApiError(400,"content should be a string") 
    }
    if(!tweetId || !isValidObjectId(tweetId)){
        throw new ApiError(400,"tweetId is required and should be valid")
    }
    if(!content || content.trim()===""){
        throw new ApiError(400,"content is required")
    }
    if(content.trim().length>280){
        throw new ApiError(400,"content should not exceed 280 characters")
    }
    const tweet = await Tweet.findById(tweetId)
     
    if(!tweet){
        throw new ApiError(404,"tweet not found")
    }
    if(tweet.owner.toString()!==req.user._id.toString()){
        throw new ApiError(403,"you are not authorized to update this tweet")
    }
    tweet.content = content.trim() 

    await tweet.save()   //make in place update by matching the tweetId
    return res
        .status(200)
        .json(new ApiResponse(200, tweet,"tweet updated successfully"))
})


const deleteTweet = asyncHandler(async (req, res) => {
    
    const {tweetId}=req.params
    if(!tweetId || !isValidObjectId(tweetId)){
        throw new ApiError(400,"tweetId is required and should be valid")

    }
    const tweet = await Tweet.findById(tweetId)
    if(!tweet){
        throw new ApiError(404,"tweet not found")

    }
    if(tweet.owner.toString()!==req.user._id.toString()){
        throw new ApiError(403,"you are not authorized to delete this tweet")
    }
    const response = await Tweet.deleteOne({_id:tweetId})

    if(response.deletedCount!==1){
        throw new ApiError(500,"tweet deletion failed")
    }
    return res
             .status(200)
             .json(new ApiResponse(200,response,"tweet deleted successfully"))

})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}