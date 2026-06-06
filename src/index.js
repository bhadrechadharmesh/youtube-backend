// require("dotenv").config()
import dotenv from "dotenv"

dotenv.config()

import connectDB from "./db/index.js"
import { app } from "./app.js"

const port = process.env.PORT || 3000;

connectDB()
.then(
    app.listen(port,()=>{
        console.log(`server is running on ${port}`)
    })
)
.catch((err)=>{
    console.log("MONGO DB connection failed",err)
})



// import express from "express";
// const app = express();
// const port = process.env.PORT || 3000;

// (async ()=>{
//     try{
//         await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`)
//         app.on("error",(error)=>{
//             console.log("ERROR: ",error)
//             throw error
//         })

//         app.listen(port,()=>{
//             console.log(`server is listening to ${port}`)
//         })

//     }catch(error){
//         console.error("ERROR: ",error)
//         throw error
//     }
// })