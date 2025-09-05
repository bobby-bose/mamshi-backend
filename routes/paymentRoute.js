// server.js
import express from "express";
import cors from "cors";
import axios from "axios";
import { v4 as uuid } from "uuid";
import mongoose from "mongoose";
import paymentModel from "../models/paymentModel";


// ----- PhonePe Config -----
const CLIENT_ID = "SU2509011920199571786178";
const CLIENT_SECRET = "fbf66a20-f2fc-4df8-b21b-242f5de3d741";
const CLIENT_VERSION = "1";



// ----- Helper: Get Access Token -----
async function getAccessToken() {
  try {
    console.log("🔹 Requesting PhonePe access token...");
    const response = await axios.post(
      "https://api.phonepe.com/apis/identity-manager/v1/oauth/token",
      null,
      {
        params: {
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          client_version: CLIENT_VERSION,
          grant_type: "client_credentials",
        },
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );
    console.log("✅ Access token received:", response.data.access_token);
    return response.data.access_token;
  } catch (error) {
    console.error("❌ Error getting access token:", error.response?.data || error.message);
    throw error;
  }
}

// ----- Route: Start Payment -----
app.post("/payments/start", async (req, res) => {
  const { amount, userId } = req.body;
  console.log("🔹 /payments/start called with:", { amount, userId });

  if (!amount || !userId) return res.status(400).json({ error: "Amount and userId are required" });

  try {
    const token = await getAccessToken();
    const merchantOrderId = "order_" + Date.now();

    const payload = {
      merchantOrderId,
      amount,
      expireAfter: 1200,
      metaInfo: { userId },
      paymentFlow: {
        type: "PG_CHECKOUT",
        message: "Payment for order",
        merchantUrls: {
          redirectUrl: "http://localhost:3000/payment-success",
        },
      },
    };

    console.log("🔹 Sending payment request to PhonePe:", payload);

    const response = await axios.post(
      "https://api.phonepe.com/apis/pg/checkout/v2/pay",
      payload,
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );

    console.log("✅ Payment request response:", response.data);

    res.json({
      merchantOrderId,
      paymentUrl: response.data.redirectUrl || response.data.paymentUrl,
    });
  } catch (error) {
    console.error("❌ Error creating payment:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to create payment" });
  }
});

// ----- Route: Complete Payment -----
app.post("/payments/complete", async (req, res) => {
  const { userId, amount, merchantOrderId, phonePeTxnId } = req.body;
  console.log("🔹 /payments/complete called with:", { userId, amount, merchantOrderId, phonePeTxnId });

  if (!userId || !amount || !merchantOrderId || !phonePeTxnId)
    return res.status(400).json({ error: "Missing payment info" });

  try {
    const token = await getAccessToken();
    console.log(`🔹 Verifying payment for merchantOrderId: ${merchantOrderId} with PhonePe`);

    const verifyResponse = await axios.get(
      `https://api.phonepe.com/apis/pg/checkout/v2/status/${merchantOrderId}`,
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );

    console.log("✅ Payment verification response:", verifyResponse.data);

    const status = verifyResponse.data.status;
    if (status !== "SUCCESS") {
      console.warn("⚠️ Payment not successful:", status);
      return res.status(400).json({ error: "Payment not successful" });
    }

    const payment = new paymentModel({ userId, amount, merchantOrderId, phonePeTxnId, status });
    await payment.save();
    console.log("✅ Payment recorded in database:", payment);

    res.json({ message: "Payment recorded successfully", payment });
  } catch (error) {
    console.error("❌ Error completing payment:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to record payment" });
  }
});
