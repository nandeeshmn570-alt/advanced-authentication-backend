import { Router } from "express";
import { toggleVideoLike,toggleCommentLike,toggleTweetLike,getLikedVideos } from "../controllers/likes.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/videos/:videoId").post(verifyJWT, toggleVideoLike)
router.route("/comments/:commentId").post(verifyJWT, toggleCommentLike)
router.route("/tweets/:tweetId").post(verifyJWT, toggleTweetLike)
router.route("/videos").get(verifyJWT, getLikedVideos)

export default router;