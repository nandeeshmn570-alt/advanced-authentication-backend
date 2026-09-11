
import { Router } from "express";
import { createTweet,getUserTweets, updateTweet, deleteTweet  } from "../controllers/tweet.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";


const router = Router()
router.route("/create-tweet").post(verifyJWT, createTweet)
router.route("/user-tweets").get(verifyJWT,getUserTweets)
router.route("/:tweetId").patch(verifyJWT,updateTweet)
router.route("/:tweetId").delete(verifyJWT,deleteTweet)

export default router