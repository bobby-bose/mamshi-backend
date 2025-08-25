const mongoose = require('mongoose');
const path = require('path');


const MONGO_URI = process.env.MONGO_URI;

const connectDatabase = () => {
    mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
        .then(() => {
            console.log("Mongoose Connected to database url :", MONGO_URI);
        });
}

module.exports = connectDatabase;