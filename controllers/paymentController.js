import dotenv from "dotenv";
dotenv.config();

import asyncErrorHandler from "../middlewares/asyncErrorHandler.js";
import Payment from "../models/paymentModel.js";
import axios from "axios";
import qs from "querystring";

// ----- PhonePe Config -----
const CLIENT_ID = process.env.CLIENT_ID || "SU2509011920199571786178";
const CLIENT_SECRET = process.env.CLIENT_SECRET || "fbf66a20-f2fc-4df8-b21b-242f5de3d741";
const CLIENT_VERSION = process.env.CLIENT_VERSION || "1";

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
            "https://api.phonepe.com/apis/identity-manager/v1/oauth/token",
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

// ----- Start Payment -----
const startPayment = asyncErrorHandler(async (req, res, next) => {
    const { amount, userId , useremail } = req.body;
    console.log("🔹 /payments/start called with:", { amount, userId });

    if (!amount || !userId) {
        console.warn("⚠️ Missing amount or userId");
        return res.status(400).json({ error: "Amount and userId are required" });
    }

    try {
        const token = await getAccessToken();
        const merchantOrderId = "order_" + Date.now();
   
const redirectURL = `${process.env.FRONTEND_ORIGIN}/payment-success/${merchantOrderId}`;

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
            "https://api.phonepe.com/apis/pg/checkout/v2/pay",
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
        res.status(500).json({ error: "Failed to create payment" });
    }
});

// ----- Complete Payment -----
const completePayment = asyncErrorHandler(async (req, res, next) => {
    const { userId, amount, merchantOrderId } = req.body;
    console.log("🔹 /payments/complete called with:", { userId, amount, merchantOrderId });

    if (!userId || !amount || !merchantOrderId) {
        console.warn("⚠️ Missing required fields for completion");
        return res.status(400).json({ error: "Missing payment info" });
    }

    try {
        const token = await getAccessToken();
        console.log(`🔹 Fetching payment status for merchantOrderId: ${merchantOrderId}`);

        const verifyResponse = await axios.get(
            `https://api.phonepe.com/apis/pg/checkout/v2/order/${merchantOrderId}/status?details=true`,
            { headers: { Authorization: `O-Bearer ${token}`, "Content-Type": "application/json" } }
        );

        console.log("🔹 Status response from PhonePe:", verifyResponse.data);

        const orderData = verifyResponse.data;
        const paymentDetails = orderData.paymentDetails;

        if (!paymentDetails || paymentDetails.length === 0) {
            console.warn("⚠️ No payment attempt found for this order");
            return res.status(400).json({ error: "No payment attempt found" });
        }

 // ----- Find the first successful payment attempt -----
const successfulPayment = paymentDetails.find(detail => detail.state === "COMPLETED");

if (!successfulPayment) {
    console.warn("⚠️ No successful payment attempt found");
    console.log("Full paymentDetails object:", paymentDetails);
    return res.status(400).json({
        error: "Payment not successful",
        paymentDetails
    });
}

const phonePeTxnId = successfulPayment.transactionId;
const status = successfulPayment.state;


console.log("🔹 Extracted phonePeTxnId:", phonePeTxnId, "status:", status);
console.log("🔹 Full successful payment detail:", successfulPayment);


        console.log("🔹 Recording payment in database...");
        const payment = await Payment.create({ userId, amount, merchantOrderId, phonePeTxnId, status ,useremail });

        console.log("✅ Payment recorded successfully:", payment);
        res.status(200).json({ success: true, message: "Payment recorded successfully", payment });

    } catch (error) {
        console.error("❌ Error completing payment:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to record payment" });
    }
});

export { startPayment, completePayment };
