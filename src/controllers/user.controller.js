import { asyncHandler } from '../utils/asyncHandler.js'
import {ApiError} from '../utils/ApiError.js'
import { User } from '../models/user.model.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';

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


export { registerUser }
