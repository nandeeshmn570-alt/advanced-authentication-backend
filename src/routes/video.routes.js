import {Router} from "express"
import {publishAVideo, getVideoById, getAllVideos, deleteVideo, updateVideo} from "../controllers/video.controller.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"
import {upload} from "../middlewares/multer.middleware.js"

const router = Router()

router.route("/upload").post(
    verifyJWT,
    upload.fields([
        { name: "videoFile", maxCount: 1 },
        { name: "thumbnail", maxCount: 1 }
    ]),
    publishAVideo
)
router.route("/").get(verifyJWT, getAllVideos)
router.route("/:videoId").get(verifyJWT, getVideoById)
router.route("/:videoId").delete(verifyJWT, deleteVideo)
router.route("/:videoId").patch(verifyJWT, updateVideo)

export default router