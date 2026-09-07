import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body

   if( typeof name !=="string" || !name.trim()  ){
    throw new ApiError(400,"Name is required")
   }

   if(typeof description !=="string" || !description.trim() ){
    throw new ApiError(400,"Description is required")
   }

   const playlist=await Playlist.create({
           name:name.trim(),
           description:description.trim(),
           owner:req.user._id,
           videos:[]
   })

   if(!playlist){
    throw new ApiError(500,"Failed to create playlist")
   }
      
   return res
         .status(201)
         .json(new ApiResponse(201,playlist,"playlist created successfully"))
   


})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    if(!userId){
        throw new ApiError(400,"userId is required")
    }

    if(!isValidObjectId(userId)){
        throw new ApiError(404,"userId must be valid")
    }
    const playlists = await Playlist.find({
        owner:userId
    }).sort({createdAt:-1})

    return res   
           .status(200)
           .json(new ApiResponse(200,playlists,"Playlist fetched successfully"))
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    if(!playlistId || !isValidObjectId(playlistId)){
        throw new ApiError(400,"The playlistId is required  and valid")
    }

    const playlist = await Playlist.findById(playlistId)
    .populate("owner","username fullName avatar")
    .populate("videos")

    if(!playlist){
        throw new ApiError(404,"No playlist found")
    }
    return res
        .status(200)
        .json(new ApiResponse(202,playlist,"The playlist  fetched successfully"))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    if(!playlistId || !isValidObjectId(playlistId)){
        throw new ApiError(400,"playlistId is valid and required")
    }

    if(!videoId || !isValidObjectId(videoId)){
        throw new ApiError(400,"videoId is required and must be valid")
    }

    const playlist = await Playlist.findById(playlistId)

    if(!playlist){
        throw new ApiError(404,"The playlist not found")
    }

     if(playlist.owner.toString() !== req.user._id.toString()){
        throw new ApiError(403,"You are not allowed to add video to this playlist")
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId,{
        $addToSet:{
            videos:videoId
        }
    },{
        new:true
    })

    if(!updatedPlaylist){
        throw new ApiError(500,"Failed to add video to playlist")
    }

    return  res 
           .status(200)
           .json(new ApiResponse(200,updatedPlaylist,"video added to playlist successfully"))
    
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    if(!playlistId || !isValidObjectId(playlistId)){
        throw new ApiError(400,"playlistId is required and valid")
    }
    if(!videoId || isValidObjectId(videoId)){
        throw new ApiError(400,"videoId is must be required and valid ")
    }

    const playlist = await Playlist.findById(playlistId)

    if(!playlist){
        throw(new ApiError(404,"playlist not found"))
    }

    if(playlist.owner.toString()!==req.user._id.toString()){
        throw new ApiError(403,"You are mot allowed to access this playlist")
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId,{
        $pull:{
            videos:videoId
        }
    },{new:true})


    if (!updatedPlaylist) {
        throw new ApiError(400, "Failed to remove video from playlist")
    }

    return res
          .status(200)
          .json(new ApiError(200,updatedPlaylist,"video deleted successfully"))

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    
    if(!playlistId || !isValidObjectId(playlistId)){
        throw new ApiError(400,"playlistId must be valid and present ")
    }

    const playlist = await Playlist.findById(playlistId)

    if(!playlist){
        throw new ApiError(400,"No playlist found")
    }

    if(playlist.owner.toString()!==req.user._id.toString()){
        throw new ApiError(403,"you are not allowed to delete this playlist")
    }
    const response = await Playlist.findByIdAndDelete(playlistId)

    return res
              .status(200)
              .json(new ApiResponse(200,response,"The playlist deleted successfully "))
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body

    if(!playlistId || !isValidObjectId(playlistId)){
     throw new ApiError(400, "playlistId must be valid and present")
    }
    
    if (typeof name !== "string" || !name.trim()) {
        throw new ApiError(400, "The name must be a non-empty string")
    }

    if (typeof description !== "string" || !description.trim()) {
        throw new ApiError(400, "The description must be a non-empty string")
    }
    
    
     
    const playlist = await Playlist.findById(playlistId)

    if(!playlist){
        throw new ApiError(404,"No playlist found")
    }
     if(playlist.owner.toString()!==req.user._id.toString()){
        throw new ApiError(403,"you are not allowed to update this playlist")
    }
    
    playlist.description=description.trim()
    playlist.name=name.trim()

    await playlist.save()
    return res
             .status(200)
             .json(new ApiResponse(200,playlist,"playlist updated successfully"))
          
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}