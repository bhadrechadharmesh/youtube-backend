// require("dotenv").config()
import dotenv from "dotenv"

import connectDB from "./db/index.js"


connectDB()



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