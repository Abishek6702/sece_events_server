const mongoose = require('mongoose');
const Event = require('./models/Event');
require('dotenv').config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const docs = await Event.find().limit(1);
    console.log('FOUND', docs.length);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
