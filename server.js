const path = require('path');
const express = require('express');
const cloudinary = require('cloudinary');
require("dotenv").config({ path: __dirname + "/.env" });


console.log("Loaded JWT_SECRET:", process.env.JWT_SECRET);

const app = require('./app');
const connectDatabase = require('./config/database');
const PORT = 4000;

// UncaughtException Error
process.on('uncaughtException', (err) => {
    console.log(`Error: ${err.message}`);
    process.exit(1);
});

// Connect to Database
connectDatabase();

// ✅ Cloudinary Config
cloudinary.config({
    cloud_name: 'dyvwuqadu',
    api_key: '393594899921333',
    api_secret: 'c64bCV8vK8Q1JfDqC0jyThLkJ7k',
});

__dirname = path.resolve();
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '/frontend/build')));
    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, 'frontend', 'build', 'index.html'));
    });
} else {
    app.get('/', (req, res) => {
        res.send('Server is Running! 🚀');
    });
}

const server = app.listen(process.env.PORT,"0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${process.env.PORT}`);
});

// Unhandled Promise Rejection
process.on('unhandledRejection', (err) => {
    console.log(`Error: ${err.message}`);
    server.close(() => process.exit(1));
});
