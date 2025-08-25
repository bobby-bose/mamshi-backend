const User = require('../models/userModel');
const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const sendToken = require('../utils/sendToken');
const ErrorHandler = require('../utils/errorHandler');

const crypto = require('crypto');
const cloudinary = require('cloudinary');
const otpStore = new Map();

// Register User
// Register User
exports.registerUser = asyncErrorHandler(async (req, res, next) => {
    const { name, email, gender, password, avatar } = req.body;

    let avatarData = undefined;
    let avatarContentType = undefined;

    if (avatar) {
        // if avatar is sent as base64 string like "data:image/png;base64,...."
        const matches = avatar.match(/^data:(.+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            return next(new ErrorHandler("Invalid image format", 400));
        }
        avatarContentType = matches[1];
        avatarData = Buffer.from(matches[2], "base64");
    }

    const user = await User.create({
        name,
        email,
        gender,
        password,
        avatar: avatarData
            ? { data: avatarData, contentType: avatarContentType }
            : undefined
    });

    sendToken(user, 201, res);
});

exports.sendOtp = asyncErrorHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new ErrorHandler("Please provide a Email Address", 400));
  }

  // Generate OTP
  const otp = Math.floor(1000 + Math.random() * 9000).toString();

  const nodemailer = require('nodemailer');

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOTP(email) {
  // Create a Nodemailer transporter using the provided credentials.
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'bobbykboseoffice@gmail.com',
      pass: 'qlxo uaqf zqix kndx', // Your App Password
    },
  });

  const otp = generateOTP();
  const otpExpiration = Date.now() + 5 * 60 * 1000; // OTP valid for 5 minutes
  otpStore.set(email, { otp, otpExpiration });

  const mailOptions = {
    from: 'bobbykboseoffice@gmail.com',
    to: email,
    subject: 'Your OTP Code For Slouch Give Away',
    text: `Your OTP Code is: ${otp}`,
    html: `<b>Your OTP is:</b> ${otp}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`OTP successfully sent to ${email}`);
      otpStore.set(email, { otp, otpExpiration });
    return { success: true, otp: otp };
  } catch (error) {
    console.error(`Error sending OTP: ${error}`);
     otpStore.delete(email);
    return { success: false, error: error };
  }
}

// Example usage:
// Replace 'recipient_email@example.com' with the actual email you want to send the OTP to.
sendOTP(email);

  res.status(200).json({
    success: true,
    message: "OTP sent successfully",
    otp, // Include OTP in response for testing purposes
  });
});

exports.otp = asyncErrorHandler(async (req, res, next) => {
    const { email, otp } = req.body;


    if (!email || !otp) {
        return next(new ErrorHandler("Please provide email and OTP", 400));
    }

    // Get the stored OTP and its expiration from the otpStore
    const storedData = otpStore.get(email);

    // Check if the OTP exists and is not expired
    if (!storedData || storedData.otp !== otp || storedData.otpExpiration < Date.now()) {
        return next(new ErrorHandler("Invalid or expired OTP", 400));
    }

    // If OTP is valid, remove it from the store to prevent reuse
    otpStore.delete(email);

    // Assuming you want to find/create a user here, using mobileNumber from the body
//     accept the parameter email from the request body and copy to a variable mobileNumber

    const mobileNumber = req.body.email;

    let user = await User.findOne({ mobileNumber });

    if (!user) {
        // If user doesn't exist, create a new one
        user = await User.create({
            name: "New User",
            mobileNumber,
            email,
        });
    }

    // Step 3: Send success response
    res.status(200).json({
        success: true,
        message: "OTP verified successfully",
        user,
    });
});



// Login User
exports.loginUser = asyncErrorHandler(async (req, res, next) => {
    const { mobileNumber } = req.body;

    if(!mobileNumber) {
        return next(new ErrorHandler("Please Enter Mobile Number", 400));
    }

    const user = await User.findOne({ mobileNumber });

    if(!user) {
        return next(new ErrorHandler("User Not Found", 404));
    }



    sendToken(user, 201, res);
});

// Logout User
exports.logoutUser = asyncErrorHandler(async (req, res, next) => {
    sessionStorage.removeItem("mobileNumber");
    res.cookie("token", null, {
        expires: new Date(Date.now()),
        httpOnly: true,
    });

    res.status(200).json({
        success: true,
        message: "Logged Out",
    });
});


// GET user by mobile number
exports.getUserByMobileNumber = async (req, res) => {
  try {
    const { mobileNumber } = req.params; // or req.query if passed as query

    if (!mobileNumber) {
      return res.status(400).json({ success: false, message: "Mobile number is required" });
    }

    const user = await User.findOne({ mobileNumber });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // return only needed fields
    const { firstName, lastName, name, email, gender, address, mobileNumber: mobile } = user;
console.log("User Details:", user);
    return res.status(200).json({
      success: true,
      user: { firstName, lastName, name, email, gender, address, mobileNumber: mobile }
    });
  } catch (err) {
    console.error(err);
    
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};



// Update User Details based on Mobile Number
exports.updateUserDetails = asyncErrorHandler(async (req, res, next) => {
    const { id,firstName, lastName, email, mobileNumber, gender, address } = req.body;

    if (!id) {
        return next(new ErrorHandler("Please provide a user ID", 400));
    }

    // Combine firstName and lastName into name
    const name = firstName + (lastName ? ` ${lastName}` : "");

    const updatedUser = await User.findOneAndUpdate(
        { _id: id },   // find by user ID
        { firstName, lastName, name, email,mobileNumber, gender, address },
        { new: true, runValidators: true }
    );

    if (!updatedUser) {
        return next(new ErrorHandler("User not found with this ID", 404));
    }

    res.status(200).json({
        success: true,
        updatedUser,
    });
});



// Forgot Password
exports.forgotPassword = asyncErrorHandler(async (req, res, next) => {
    
    const user = await User.findOne({email: req.body.email});

    if(!user) {
        return next(new ErrorHandler("User Not Found", 404));
    }

    const resetToken = await user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    // const resetPasswordUrl = `${req.protocol}://${req.get("host")}/password/reset/${resetToken}`;
    const resetPasswordUrl = `https://${req.get("host")}/password/reset/${resetToken}`;

    // const message = `Your password reset token is : \n\n ${resetPasswordUrl}`;

   
});

// Reset Password
exports.resetPassword = asyncErrorHandler(async (req, res, next) => {

    // create hash token
    const resetPasswordToken = crypto.createHash("sha256").update(req.params.token).digest("hex");

    const user = await User.findOne({ 
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() }
    });

    if(!user) {
        return next(new ErrorHandler("Invalid reset password token", 404));
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();
    sendToken(user, 200, res);
});

// Update Password
exports.updatePassword = asyncErrorHandler(async (req, res, next) => {

    const user = await User.findById(req.user.id).select("+password");

    const isPasswordMatched = await user.comparePassword(req.body.oldPassword);

    if(!isPasswordMatched) {
        return next(new ErrorHandler("Old Password is Invalid", 400));
    }

    user.password = req.body.newPassword;
    await user.save();
    sendToken(user, 201, res);
});

// Update User Profile
exports.updateProfile = asyncErrorHandler(async (req, res, next) => {

    const newUserData = {
        name: req.body.name,
        email: req.body.email,
    }

    if(req.body.avatar !== "") {
        const user = await User.findById(req.user.id);

        const imageId = user.avatar.public_id;

        await cloudinary.v2.uploader.destroy(imageId);

        const myCloud = await cloudinary.v2.uploader.upload(req.body.avatar, {
            folder: "avatars",
            width: 150,
            crop: "scale",
        });

        newUserData.avatar = {
            public_id: myCloud.public_id,
            url: myCloud.secure_url,
        }
    }

    await User.findByIdAndUpdate(req.user.id, newUserData, {
        new: true,
        runValidators: true,
        useFindAndModify: true,
    });

    res.status(200).json({
        success: true,
    });
});

// ADMIN DASHBOARD

// Get All Users --ADMIN
exports.getAllUsers = asyncErrorHandler(async (req, res, next) => {

    const users = await User.find();

    res.status(200).json({
        success: true,
        users,
    });
});

// Get Single User Details --ADMIN
exports.getSingleUser = asyncErrorHandler(async (req, res, next) => {

    const user = await User.findById(req.params.id);

    if(!user) {
        return next(new ErrorHandler(`User doesn't exist with id: ${req.params.id}`, 404));
    }

    res.status(200).json({
        success: true,
        user,
    });
});

// Update User Role --ADMIN
exports.updateUserRole = asyncErrorHandler(async (req, res, next) => {

    const newUserData = {
        name: req.body.name,
        email: req.body.email,
        gender: req.body.gender,
        role: req.body.role,
    }

    await User.findByIdAndUpdate(req.params.id, newUserData, {
        new: true,
        runValidators: true,
        useFindAndModify: false,
    });

    res.status(200).json({
        success: true,
    });
});

// Delete Role --ADMIN
exports.deleteUser = asyncErrorHandler(async (req, res, next) => {

    const user = await User.findById(req.params.id);

    if(!user) {
        return next(new ErrorHandler(`User doesn't exist with id: ${req.params.id}`, 404));
    }

    await user.remove();

    res.status(200).json({
        success: true
    });
});