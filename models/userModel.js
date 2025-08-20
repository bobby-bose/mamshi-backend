const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [true, "Please Enter Your First Name"],
    },
    lastName: {
        type: String,
        default: ""
    },
    name: { // optional, can keep full name for convenience
        type: String,
        default: function() { return this.firstName + " " + this.lastName; }
    },
    email: {
        type: String,
        required: [true, "Please Enter Your Email"],
        unique: true,
        validate: [validator.isEmail, "Please Enter a valid Email"]
    },
    mobileNumber: {
        type: String,
        required: [true, "Please Enter Your Mobile Number"],
        unique: true,
    },
    address: {
        type: String,
        default: ""
    },
    gender: {
        type: String,
        required: [true, "Please Enter Gender"]
    },
    password: {
        type: String,
        required: [true, "Please Enter Your Password"],
        minlength: 6,
        select: false // don’t return password by default
    },
    avatar: {
        data: Buffer,
        contentType: String
    },
    role: {
        type: String,
        default: "user",
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
});

// Hash password before saving
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// JWT token method
userSchema.methods.getJWTToken = function () {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
}

// Compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
}

// Generate password reset token
userSchema.methods.getResetPasswordToken = async function () {
    const resetToken = crypto.randomBytes(20).toString("hex");
    this.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    this.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
    return resetToken;
}

module.exports = mongoose.model('User', userSchema);
