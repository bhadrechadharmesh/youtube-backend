import { asyncHandler } from '../utils/asyncHandler.js'
import {ApiError} from '../utils/ApiError.js'
import { User } from '../models/user.model.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async(userId)=>{

    try{
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        
        await user.save({validateBeforeSave:false});

        return {accessToken,refreshToken}

    } catch(error){
        throw new ApiError(500 , error.message);
    }

}


const registerUser = asyncHandler(async (req, res) => {
    let {username, email,fullName, password} = req.body;
    // check if all fields are provided

    if(
        [fullName,email,username,password].some((field) => field?.trim() === "")
    ){
        throw new ApiError(400, "All fields are required")
    }

    const existingUser = await User.findOne({ 
        $or: [ {username}, {email} ]
    });

    if(existingUser){
        throw new ApiError(409 , "User already exists");
    }
    
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400 , "Avatar is required");
    }
    
    const uploadedAvatar = await uploadOnCloudinary(avatarLocalPath);
    const uploadedCoverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!uploadedAvatar){
        throw new ApiError(400 , "Avatar upload failed");
    }

    if(!uploadedCoverImage){
        throw new ApiError(400 , "CoverImage upload failed");
    }

    const user = await User.create({
        username : username.toLowerCase(),
        email: email.toLowerCase(),
        fullName,
        password,
        avatar: uploadedAvatar.url,
        coverImage: uploadedCoverImage?.url || ""
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if(!createdUser){
        throw new ApiError(500 , "Something went wrong while registering the user");
    }

    return res.status(200).json(
        new ApiResponse(200,createdUser,"User registered successfully")
    );

});


const loginUser = asyncHandler(async(req,res)=>{

    //req->body
    //username or email
    //password
    //find user
    //check if password is correct
    //generate access token
    //generate refresh token
    //store in cookies
    //return response
    
    const {email, username, password} = req.body;

    if(!username && !email){
        throw new ApiError(400 , "Email or username are required");
    }

    const user = await User.findOne({
        $or:[{username},{email}]
    })

    if(!user){
        throw new ApiError(404,"user does not exist")
    }

    const isPasswordCorrect = await user.isPasswordCorrect(password);

    if(!isPasswordCorrect){
        throw new ApiError(401,"invalid user password")
    }

    const {accessToken,refreshToken} = await generateAccessAndRefreshToken(user._id);
    
    const LoggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options={
        httpOnly:true,
        secure:true
    }

    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(200,{
            accessToken,
            refreshToken,
            LoggedInUser
        },"User logged in successfully")
    )
})


const logoutUser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                refreshToken: ""
            }
        },
        {new:true}
    )

    const options={
        httpOnly:true,
        secure:true
    }

    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{} ,"User logged out successfully"))

})


const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    
    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized request")
    }

    const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)

    const user = await User.findById(decodedToken._id)
    
    if(!user){
        throw new ApiError(404,"user does not exist")
    } 

    if(user.refreshToken !== incomingRefreshToken){
        throw new ApiError(401,"Invalid refresh token")
    }

    const options ={
        httpOnly : true,
        secure : true
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id);

    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(new ApiResponse(200,{},"Access token refreshed successfully"))

})


const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword} = req.body;    
    
    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if(!isPasswordCorrect){
        throw new ApiError(401,"invalid user password")
    }
    user.password = newPassword;
    await user.save({validateBeforeSave:false});
    return res.status(200).json(new ApiResponse(200,{},"Password changed successfully"))
    
})


const getCurrentUser = asyncHandler(async(req,res)=>{
    return res.status(200).json(new ApiResponse(200,req.user,"User fetched successfully"))
})


const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullName, email} = req.body;

    if(!fullName || !email){
        throw new ApiError(400,"All fields are required");
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName,
                email
            }
        },
        {new:true}
    ).select("-password")

    return res.status(200).json(new ApiResponse(200,updatedUser,"Account details updated successfully"))
})

const updateAvatar = asyncHandler(async(req,res)=>{
    const avatarLocalPath = req.file?.path;   

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is required");
    }
    
    const user = await User.findById(req.user?._id);
    
    const deletedAvatar = await deleteFileOnCloudinary(user.avatar);

    const uploadedAvatar = await uploadOnCloudinary(avatarLocalPath);

    if(!uploadedAvatar){
        throw new ApiError(400,"Avatar upload failed");
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: uploadedAvatar.url
            }
        },
        {new:true}
    ).select("-password")

    return res.status(200).json(new ApiResponse(200,updatedUser,"Avatar updated successfully"))
})

const updateCoverImage = asyncHandler(async(req,res)=>{
    const coverImageLocalPath = req.file?.path;
    
    if(!coverImageLocalPath){
        throw new ApiError(400,"Cover image is required");
    }

    const user = await User.findById(req.user?._id);

    const deletedCoverImage = await deleteFileOnCloudinary(user.coverImage);
    const uploadedCoverImage = await uploadOnCloudinary(coverImageLocalPath);
    if(!uploadedCoverImage){
        throw new ApiError(400,"Cover image upload failed");
    }
    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: uploadedCoverImage.url
            }
        },
        {new:true}
    ).select("-password")
    return res.status(200).json(new ApiResponse(200,updatedUser,"Cover image updated successfully"))
})


const getUserChannelProfile = asyncHandler(async(req,res)=>{
    const {username} = req.params;

    if(!username.trim()){
        throw new ApiError(400,"Username is required")
    }

    const channel = await User.aggregate([
        {
            $match : {
                username : username?.toLowerCase()
            }
        },
        {
            $lookup : {
                from : "subscriptions",
                localField : "_id",
                foreignField : "channel",
                as : "subscribers"
            },
        },
        {
            $lookup : {
                from : "subscriptions",
                localField : "_id",
                foreignField : "subscriber",
                as : "subscribedTo"
            }
        },
        {
            $addFields : {
                subscribersCount : {$size: "$subscribers"},
                subscribedToCount : {$size: "$subscribedTo"},
                isSubscribed : {
                    $cond : {
                        if : { 
                            $in : [req.user?._id, "$subscribers.subscriber"] 
                        },
                        then : true,
                        else : false
                    }
                }
            },
        },
        {
            $project : {
                fullName : 1,
                userName : 1,
                subscribersCount : 1,
                subscribedToCount : 1,
                isSubscribed : 1,
                avatar : 1,
                coverImage : 1,
                email : 1
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(404,"No channel found")
    }

    return res.status(200).json(new ApiResponse(200,channel[0],"User channel profile fetched successfully"))
})

export { registerUser,loginUser,logoutUser,refreshAccessToken,changeCurrentPassword,getCurrentUser,updateAccountDetails, updateAvatar, updateCoverImage, getUserChannelProfile }
