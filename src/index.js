import dns from "dns"
import dotenv from "dotenv"
import connectDB from "./db/index.js"
import { app } from './app.js'

dns.setServers(['8.8.8.8', '8.8.4.4'])

dotenv.config({
    path: './.env'
})

connectDB()
    .then(() => {
        app.listen(process.env.PORT || 8000, () => {
            console.log(`⚙️ Server is running at port : ${process.env.PORT}`);
        })
        app.on("error", (error) => {
            console.log("ERROR", error)
            throw error
        })
    })
    .catch((err) => {
        console.log("MONGO db connection failed !!! ", err);
    })


