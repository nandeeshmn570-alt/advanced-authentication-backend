/**
 * Dashboard controller: returns channel-level stats and owned videos for the dashboard API.
 */
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res)=> {
    const channelVideos = await Video.find({
        owner: req.user._id
    })
    

    const totalSubscribers = await Subscription.countDocuments({
        channel: req.user._id
    })

    const totalVideos = channelVideos.length

    
    let totalViews = 0
    const videoIds = []

    for (const video of channelVideos) {
        totalViews = totalViews + (video.views || 0)
        videoIds.push(video._id)
    }

    

    const totalLikes = await Like.countDocuments({
        video: { $in: videoIds }
    })

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { totalVideos, totalViews, totalSubscribers, totalLikes },
                "Channel stats fetched successfully"
            )
        )
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel

    const { page: pageParam = 1, limit: limitParam = 10 } = req.query
    const page = Number.parseInt(pageParam, 10)
    const limit = Number.parseInt(limitParam, 10)

     if(!Number.isInteger(page) || !Number.isInteger(limit) || page < 1 || limit < 1){
        throw new ApiError(400,"page and limit must be positive")
    }
    const skip = (page - 1) * limit
    const videos = await Video.find({
        owner:req.user._id
    }
    ).sort({createdAt:-1})
     .limit(limit) 
     .skip(skip)

   if(videos.length<1){
       throw new ApiError(404,"No videos found")
   }
    return res
           .status(200)
           .json(new ApiResponse(200,videos,"videos of owner fetched successfully"))
     
})

export {
    getChannelStats, 
    getChannelVideos
    }