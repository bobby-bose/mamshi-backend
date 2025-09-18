const dotenv = require("dotenv");

dotenv.config();

const Counter = require("../models/counterModel");
const nodemailer = require("nodemailer");
const asyncErrorHandler = require("../middlewares/asyncErrorHandler");
const User = require("../models/userModel");
const axios = require("axios");
const qs = require("querystring");
const Product = require("../models/productModel");
const Order = require("../models/orderModel");


// ----- PhonePe Config -----
const CLIENT_ID = process.env.CLIENT_ID || "SU2509011920199571786178";
const CLIENT_SECRET = process.env.CLIENT_SECRET || "fbf66a20-f2fc-4df8-b21b-242f5de3d741";
const CLIENT_VERSION = process.env.CLIENT_VERSION || "1";
const userId = "user_" + Math.floor(Math.random() * 1000000);

// ----- Helper: Get Access Token -----
async function getAccessToken() {
    try {
        console.log("🔹 Requesting PhonePe access token...");
        const requestBody = qs.stringify({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            client_version: CLIENT_VERSION,
            grant_type: "client_credentials"
        });

        const response = await axios.post(
            `https://api.phonepe.com/apis/identity-manager/v1/oauth/token`,
            requestBody,
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );

        console.log("✅ Access token received:", response.data.access_token);
        return response.data.access_token;
    } catch (error) {
        console.error("❌ Error getting access token:", error.response?.data || error.message);
        throw error;
    }
}

async function getNextPurchaseNumber() {
  const counter = await Counter.findOneAndUpdate(
    { name: "purchaseNumber" },
    { $inc: { seq: 0.5 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

// ----- Start Bulk Payment -----
const startBulkPayment = asyncErrorHandler(async (req, res, next) => {
    const { amount, useremail, products, deliveryDetails } = req.body;
    console.log("🔹 /payments/start-cart called with:", { amount, useremail, products });

    // Validate amount
    const parsedAmount = parseFloat(amount) * 100;
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
        console.warn("⚠️ Invalid amount:", amount);
        return res.status(400).json({ error: "Valid amount is required" });
    }

    if (!useremail) {
        console.warn("⚠️ Missing user email");
        return res.status(400).json({ error: "User email is required" });
    }

    if (!products || !Array.isArray(products) || products.length === 0) {
        console.warn("⚠️ No products passed for bulk order");
        return res.status(400).json({ error: "Products array is required" });
    }

    try {
        const token = await getAccessToken();
        const merchantOrderId = "bulk_order_" + Date.now();

        const redirectURL = `${process.env.FRONTEND_ORIGIN}/payment-bulk-success/${merchantOrderId}`;

        const payload = {
            merchantOrderId,
            amount: parsedAmount, // validated amount
            expireAfter: 1200,
            metaInfo: { userId },
            paymentFlow: {
                type: "PG_CHECKOUT",
                message: "Payment for bulk order",
                merchantUrls: {
                    redirectUrl: redirectURL,
                    callbackUrl: `${process.env.BACKEND_ORIGIN}/payments/callback/${merchantOrderId}`,
                },
            },
        };

        console.log("🔹 Sending bulk payment request to PhonePe:", payload);

        const response = await axios.post(
            `https://api.phonepe.com/apis/pg/checkout/v2/pay`,
            payload,
            { headers: { Authorization: `O-Bearer ${token}`, "Content-Type": "application/json" } }
        );

        console.log("✅ Bulk payment request response received:", response.data);

        res.status(200).json({
            merchantOrderId,
            paymentUrl: response.data.redirectUrl || response.data.paymentUrl,
        });
    } catch (error) {
        console.error("❌ Error creating bulk payment:", error.response?.data || error.message);
        return res.status(error.response?.status || 500).json({
            error: error.response?.data || error.message
        });
    }
});

// ----- Complete Bulk Payment -----
const completeBulkPayment = asyncErrorHandler(async (req, res, next) => {
  const { amount, merchantOrderId, email, products, deliveryDetails } = req.body;
  console.log("🔹 /payments/complete-cart called with:", { amount, merchantOrderId, email, products });

  // Validate amount
  const parsedAmount = parseFloat(amount);
  if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
    console.error("❌ Invalid amount:", amount);
    return res.status(400).json({ error: "Valid amount is required" });
  }

  // Validate required fields
  const missingFields = [];
  if (!merchantOrderId) missingFields.push("merchantOrderId");
  if (!email) missingFields.push("email");
  if (!products) missingFields.push("products");
  if (!deliveryDetails) missingFields.push("deliveryDetails");

  if (missingFields.length > 0) {
    console.error("❌ Missing fields:", missingFields.join(", "));
    return res.status(400).json({ 
      error: `Missing required fields: ${missingFields.join(", ")}`
    });
  }

  try {
    const token = await getAccessToken();

    const verifyResponse = await axios.get(
     `https://api.phonepe.com/apis/pg/checkout/v2/order/${merchantOrderId}/status`,
      { headers: { Authorization: `O-Bearer ${token}`, "Content-Type": "application/json" } }
    );

    console.log("🔹 Status response from PhonePe:", verifyResponse.data);

    const orderData = verifyResponse.data.data || verifyResponse.data;
    let successfulPayment = null;

    if (Array.isArray(orderData.paymentDetails)) {
      successfulPayment = orderData.paymentDetails.find(d => d.state === "COMPLETED");
    } else if (orderData.state === "COMPLETED") {
      successfulPayment = orderData;
    }

    if (!successfulPayment) {
      return res.status(400).json({
        error: "Payment not successful",
        details: orderData
      });
    }

    // ✅ Payment verified
    const phonePeTxnId = successfulPayment.transactionId;
    const status = successfulPayment.state;

    // Parse products
    const parsedProducts = typeof products === "string" ? JSON.parse(products) : products;
    const orderedProducts = [];

    for (const item of parsedProducts) {
      const productDoc = await Product.findById(item.productId);
      if (!productDoc) {
        console.warn(`⚠️ Product not found for ID: ${item.productId}`);
        continue;
      }

      orderedProducts.push({
        product: productDoc._id,
        productName: productDoc.Name,
        description: productDoc.Description,
        color: item.color,
        size: item.size,
        count: item.count,
        price: productDoc.Price,
        stock: productDoc.stock,
        mainImage: productDoc.main,
        subImage: productDoc.sub
      });

      // Reduce stock
      productDoc.stock = Math.max(0, productDoc.stock - item.count);
      await productDoc.save();
    }

    console.log("✅ Bulk Ordered Products:", orderedProducts);

    const userDoc = await User.findOne({ email: email });
    if (!userDoc) {
      throw new Error("User not found with this email");
    }

    let deliveryInfo = deliveryDetails;
    if (typeof deliveryDetails === "string") {
      deliveryInfo = JSON.parse(deliveryDetails);
    }

    const purchaseNumber = await getNextPurchaseNumber();
    const couponCode = `SLOUCH-COUPON-${purchaseNumber.toString().padStart(5, '0')}`;

    // Create the bulk order
    const order = await Order.create({
      user: userDoc._id,
      products: orderedProducts,
      totalAmount: parsedAmount,
      payment: {
        merchantOrderId,
        phonePeTxnId,
        status,
        paidAt: new Date()
      },
      deliveryDetails: deliveryInfo,
      purchaseNumber,
      luckyDrawCode: couponCode
    });

    await sendCoupon(email, couponCode);

    console.log("✅ BULK ORDER created:", order);

    res.status(200).json({
      success: true,
      message: "Bulk payment verified and order created successfully",
      merchantOrderId,
      phonePeTxnId,
      order
    });

  } catch (error) {
    console.error("❌ Error completing bulk payment:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to complete bulk payment" });
  }
});


async function sendCoupon(email, couponCode) {
    if (couponCode.includes(".")) {
        console.warn(`⚠️ Skipping coupon with invalid code: ${couponCode}`);
        return { success: false, error: "Invalid coupon code (decimal found)" };
    }

    try {
        const response = await axios.post('https://mamshi-backend.onrender.com/send-coupon', {
            email: email,
            couponCode: couponCode
        });

        if (response.data.success) {
            console.log(`Coupon code ${couponCode} sent to ${email}`);
            return { success: true };
        } else {
            console.error(`Failed to send coupon: ${response.data.error}`);
            return { success: false, error: response.data.error };
        }
    } catch (error) {
        console.error(`Error calling email microservice: ${error.message}`);
        return { success: false, error: error.message };
    }
}

module.exports = {
  startBulkPayment,
  completeBulkPayment,
  sendCoupon
};
