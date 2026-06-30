const mongoose = require('mongoose');
const dontenv = require('dotenv');
const dns = require('dns')

dontenv.config();

dns.setServers(["8.8.8.8", "8.8.4.4"]);

// MongoDB connecton establishment
const connectDB = async()=>{
    try{
        await mongoose.connect(process.env.MONGO_URI); // MongoDB connection string from env file
        console.log('MongoDB Connected Sucessfully');
    } catch (error){
        console.error('MongoDb Connection Failed :', error.moessage || error);
        process.exit(1);
    }
};

module.exports = connectDB