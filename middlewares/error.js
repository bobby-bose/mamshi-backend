const ErrorHandler = require("../utils/errorHandler");

module.exports = (err, req, res, next) => {
    console.error("ERROR:", err);

    // Always ensure a default status code
    const statusCode = err.statusCode && Number.isInteger(err.statusCode) 
        ? err.statusCode 
        : 500;

    const message = err.message || "Internal Server Error";

    res.status(statusCode).json({
        success: false,
        message: message,
        reason: err.stack || "An error occurred",
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined
    });
};
