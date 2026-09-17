import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    const subscriberID = req.user._id
    if(!isValidObjectId(channelId)){
        throw new ApiError(400,"Invalid channel ID")
    }
    if(subscriberID.toString()===channelId.toString()){
        throw new ApiError(400,"you cannot subscribe to yourself")
    }
//check it aftter
    const channel = await User.findById(channelId)
    if(!channel){
        throw new ApiError(404,"channel not found")
    }

    const existingSubscription = await Subscription.findOne({
        subscriber:subscriberID,
        channel:channelId
    })

    if(existingSubscription){
        await existingSubscription.deleteOne()

         return res
             .status(200)
             .json(new ApiResponse(200, { subscribed: false }, "Channel unsubscribed successfully"))
    }

    const subscription = await Subscription.create({
    subscriber: subscriberID,
    channel: channelId
  })

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        subscribed: true,
        subscription
      },
      "Channel subscribed successfully"
    )
  )
})



// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    const subscribers = await Subscription.find({
        channel: channelId
    }).populate("subscriber", "username email")


    return res.status(200).json(new ApiResponse(200, subscribers, "Subscribers fetched successfully"))
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
    const channels = await Subscription.find({
        subscriber: subscriberId
    }).populate("channel", "username email")
    
    return res.status(200).json(new ApiResponse(200, channels, "Subscribed channels fetched successfully"))
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}