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
// ----- Start Payment -----
const startPayment = asyncErrorHandler(async (req, res, next) => {
    const { amount,  useremail } = req.body;
    console.log("🔹 /payments/start called with:", { amount });

    if (!amount ) {
        console.warn("⚠️ Missing amount");
        return res.status(400).json({ error: "Amount and  required" });
    }

    try {
        const token = await getAccessToken();
        const merchantOrderId = "order_" + Date.now();
   
const redirectURL = `https://slouch.netlify.app/payment-success/${merchantOrderId}`;

const payload = {
    merchantOrderId,
    amount,
    expireAfter: 1200,
    metaInfo: { userId },
    paymentFlow: {
        type: "PG_CHECKOUT",
        message: "Payment for order",
        merchantUrls: {
            redirectUrl: redirectURL,   // ✅ include orderId here
            callbackUrl: `${process.env.BACKEND_ORIGIN}/payments/callback/${merchantOrderId}`, // optional but recommended
        },
    },
};


        console.log("🔹 Sending payment request to PhonePe:", payload);

        const response = await axios.post(
            `https://api.phonepe.com/apis/pg/checkout/v2/pay`,
            payload,
            { headers: { Authorization: `O-Bearer ${token}`, "Content-Type": "application/json" } }
        );

        console.log("✅ Payment request response received:", response.data);

        res.status(200).json({
            merchantOrderId,
            paymentUrl: response.data.redirectUrl || response.data.paymentUrl,
        });
    } catch (error) {
  console.error("❌ Error creating payment:", error.response?.data || error.message);
  return res.status(error.response?.status || 500).json({
    error: error.response?.data || error.message
  });
}

});

const completePayment = asyncErrorHandler(async (req, res, next) => {
  const { amount, merchantOrderId, email, products, deliveryDetails } = req.body;
  console.log("🔹 /payments/complete called with:", {  amount, merchantOrderId, email,products });

 if (!amount || !merchantOrderId || !email || !products || !deliveryDetails) {
  const missingFields = [];

  if (!amount) missingFields.push("amount");
  if (!merchantOrderId) missingFields.push("merchantOrderId");
  if (!email) missingFields.push("email");
  if (!products) missingFields.push("products");
  if (!deliveryDetails) missingFields.push("deliveryDetails");

  console.error("❌ Missing fields:", missingFields.join(", "));

  return res.status(400).json({ 
    error: `Missing order/payment info: ${missingFields.join(", ")}`
  });
}


  try {
    const token = await getAccessToken();

    const verifyResponse = await axios.get(
     `https://api.phonepe.com/apis/pg/checkout/v2/order/${merchantOrderId}/status?details=true`,
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

// Parse the string to a JS array
const parsedProducts = JSON.parse(products);

// Array to hold the full product info
const orderedProducts = [];

for (const item of parsedProducts) {
  // Fetch product from DB
  const productDoc = await Product.findById(item.productId);

  if (!productDoc) {
    console.warn(`⚠️ Product not found for ID: ${item.productId}`);
    continue;
  }

  // Push the full product details into orderedProducts
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

  // Optional: reduce stock in DB
  productDoc.stock = Math.max(0, productDoc.stock - item.count);
  await productDoc.save();
}

console.log("✅ Ordered Products:", orderedProducts);

    
  const userDoc = await User.findOne({ email: email });
if (!userDoc) {
  throw new Error("User not found with this email");
}

    console.log("the userDoc is", userDoc)
   orderedProducts.forEach(p => {
  console.log("Product ID:", p.product);
  console.log("Product Name:", p.productName);
  console.log("Color:", p.color);
  console.log("Size:", p.size);
  console.log("Count:", p.count);
  console.log("Price:", p.price);
});

    console.log("the amount is", amount)
    console.log("the merchantOrderId is", merchantOrderId)
    console.log("the phonePeTxnId is", phonePeTxnId)
    console.log("the status is", status)
    console.log("the deliveryDetails is", deliveryDetails)

let deliveryInfo = deliveryDetails;
if (typeof deliveryDetails === "string") {
  deliveryInfo = JSON.parse(deliveryDetails);
}
 const purchaseNumber = await getNextPurchaseNumber();
 const couponCode=`SLOUCH-COUPON-${purchaseNumber.toString().padStart(5, '0')}`;
    // Create the order directly
    const order = await Order.create({
       user: userDoc._id
,
      products: orderedProducts,
      totalAmount: amount,
      payment: {
        merchantOrderId,
        phonePeTxnId,
        status,
        paidAt: new Date()
      },
      deliveryDetails:deliveryInfo,
      purchaseNumber,
       luckyDrawCode: couponCode
    });
sendCoupon(email, couponCode);
    console.log("✅ GIVE AWAY SEND created:", order);
    res.status(200).json({
      success: true,
      message: "Payment verified and order created successfully",
      merchantOrderId,
      phonePeTxnId,
      order
    });

  } catch (error) {
    console.error("❌ Error completing payment:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to complete payment" });
  }
});




export async function sendCoupon(email, couponCode) {
    if (couponCode.includes(".")) {
    console.warn(`⚠️ Skipping coupon with invalid code: ${couponCode}`);
    return { success: false, error: "Invalid coupon code (decimal found)" };
  }
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user:'bobbykboseoffice@gmail.com', // your Gmail
      pass:'qlxo uaqf zqix kndx'
    },
  });

  const mailOptions = {
    from: 'bobbykboseoffice@gmail.com',
    to: email,
    subject: "Your GIVE AWAY CODE For Slouch Give Away",
    text: `Your GIVE AWAY CODE is: ${couponCode}`,
    html: `<h2>Slouch Giveaway</h2><p>Your GIVE AWAY CODE is: <b>${couponCode}</b></p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Coupon code ${couponCode} sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error(`Error sending coupon: ${error.message}`);
    return { success: false, error: error.message };
  }
}

export { startPayment, completePayment };
