/**
 * Dashboard controller: returns channel-level stats and owned videos for the dashboard API.
 */
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  const channelVideos = await Video.find({
    owner: req.user._id,
  });

  const totalSubscribers = await Subscription.countDocuments({
    channel: req.user._id,
  });

  const totalVideos = channelVideos.length;

  let totalViews = 0;
  const videoIds = [];

  for (const video of channelVideos) {
    totalViews = totalViews + (video.views || 0);
    videoIds.push(video._id);
  }

  const totalLikes = await Like.countDocuments({
    video: { $in: videoIds },
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { totalVideos, totalViews, totalSubscribers, totalLikes },
        "Channel stats fetched successfully"
      )
    );
});

const getChannelVideos = asyncHandler(async (req, res) => {
  const { page: pageParam = 1, limit: limitParam = 10 } = req.query;
  const page = Number(pageParam);
  const limit = Number(limitParam);

  if (
    !Number.isInteger(page) ||
    !Number.isInteger(limit) ||
    page < 1 ||
    limit < 1 ||
    limit > 100
  ) {
    throw new ApiError(
      400,
      "page must be positive and limit must be between 1 and 100"
    );
  }
  const skip = (page - 1) * limit;
  const videos = await Video.find({
    owner: req.user._id,
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

  const total = await Video.countDocuments({ owner: req.user._id });
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        videos,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      "Channel videos fetched successfully"
    )
  );
});

export { getChannelStats, getChannelVideos };
