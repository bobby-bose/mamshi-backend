const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// -------------------- CONFIG --------------------
const CLIENT_ID = 'SU2509011920199571786178';
const CLIENT_VERSION = '1';
const CLIENT_SECRET = 'fbf66a20-f2fc-4df8-b21b-242f5de3d741';

// -------------------- UTILITY: GET ACCESS TOKEN --------------------
async function getAccessToken() {
  console.log('[AccessToken]: Generating new access token...');
  
  const body = 'client_id=SU2509011920199571786178&client_secret=fbf66a20-f2fc-4df8-b21b-242f5de3d741&client_version=1&grant_type=client_credentials';

  const tokenResponse = await axios.post(
    'https://api.phonepe.com/apis/identity-manager/v1/oauth/token',
    body,
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  console.log('[AccessToken]: Access token received:', tokenResponse.data.access_token);
  return tokenResponse.data.access_token;
}


// -------------------- START PAYMENT --------------------
app.post('/api/start-payment', async (req, res) => {
  console.log('[StartPayment]: Request received', req.body);
  const { amount, userId } = req.body;
  if (!amount || !userId) {
    console.log('[StartPayment]: ERROR - Amount or UserId missing!');
    return res.status(400).json({ error: 'Amount and userId are required.' });
  }

  try {
    const accessToken = await getAccessToken();
    console.log('[StartPayment]: Access token obtained for initiating payment.');

    const merchantOrderId = "TX" + Date.now();
    console.log('[StartPayment]: Generated merchantOrderId:', merchantOrderId);

    const paymentBody = {
      merchantOrderId,
      amount: parseInt(amount, 10) * 100,
      paymentFlow: {
        type: "PG_CHECKOUT",
        message: "Payment for goods",
        merchantUrls: {
          redirectUrl: 'https://www.google.com/',
          callbackUrl: 'https://backend-paypal.onrender.com/api/payment-callback'
        }
      }
    };

    console.log('[StartPayment]: Payment body prepared:', paymentBody);

    // Initiate payment
    const redirectResponse = await axios.post(
      'https://api.phonepe.com/apis/pg/checkout/v2/pay',
      paymentBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `O-Bearer ${accessToken}`
        }
      }
    );

    const redirectUrl = redirectResponse.data.redirectUrl;
    console.log('[StartPayment]: Redirect URL received:', redirectUrl);

    // Immediately check status
    console.log('[StartPayment]: Checking transaction status immediately...');
    const statusResponse = await axios.get(
      `https://api.phonepe.com/apis/pg/checkout/v2/order/${merchantOrderId}/status?details=true`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `O-Bearer ${accessToken}`
        }
      }
    );

    const orderData = statusResponse.data;
    console.log('[StartPayment]: Immediate status response:', orderData);

    const isPaid = orderData.paymentDetails?.some(p => p.state === 'COMPLETED');
    console.log('[StartPayment]: Payment COMPLETED?', isPaid);

    res.json({
      redirectUrl,
      merchantOrderId,
      status: isPaid ? 'SUCCESS' : 'PENDING',
      rawData: orderData
    });

  } catch (error) {
    console.error('[StartPayment]: API call failed:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Failed to complete API sequence' });
  }
});


// -------------------- CALLBACK --------------------
app.post('/api/payment-callback', async (req, res) => {
  console.log('[Callback]: Callback received with data:', req.body);

  const paymentData = req.body;
  const merchantOrderId = paymentData?.merchantOrderId || paymentData?.orderId;
  console.log('[Callback]: Merchant Order ID:', merchantOrderId);

  try {
    const accessToken = await getAccessToken();
    console.log('[Callback]: Access token obtained for status check.');

    const statusResponse = await axios.get(
      `https://api.phonepe.com/apis/pg/checkout/v2/order/${merchantOrderId}/status?details=true`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `O-Bearer ${accessToken}`
        }
      }
    );

    console.log('[Callback]: Status response received:', statusResponse.data);
    const orderData = statusResponse.data;
    const isPaid = orderData.paymentDetails?.some(p => p.state === 'COMPLETED');
    console.log('[Callback]: Payment COMPLETED?', isPaid);

    if (isPaid) {
      console.log(`[Final Confirmation]: Order ${merchantOrderId} SUCCESS ✅`);
    } else {
      console.log(`[Final Confirmation]: Order ${merchantOrderId} FAILED ❌`);
    }

  } catch (err) {
    console.error('[Callback]: Status check error:', err.response ? err.response.data : err.message);
  }

  res.status(200).send('Callback processed.');
});

// -------------------- MANUAL CHECK --------------------
app.get('/api/check-status/:orderId', async (req, res) => {
  const { orderId } = req.params;
  console.log('[ManualCheck]: Checking status for orderId:', orderId);

  try {
    const accessToken = await getAccessToken();
    console.log('[ManualCheck]: Access token obtained for manual check.');

    const statusResponse = await axios.get(
      `https://api.phonepe.com/apis/pg/checkout/v2/order/${orderId}/status?details=true`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `O-Bearer ${accessToken}`
        }
      }
    );

    const orderData = statusResponse.data;
    console.log('[ManualCheck]: Status response received:', orderData);

    const isPaid = orderData.paymentDetails?.some(p => p.state === 'COMPLETED');
    console.log('[ManualCheck]: Payment COMPLETED?', isPaid);

    res.json({
      orderId,
      status: isPaid ? 'SUCCESS' : 'FAILED',
      rawData: orderData
    });

  } catch (err) {
    console.error('[ManualCheck]: Error checking status:', err.response ? err.response.data : err.message);
    res.status(500).json({ error: err.response ? err.response.data : err.message });
  }
});

// -------------------- START SERVER --------------------
app.listen(PORT, () => {
  console.log(`✅ Production server running at http://localhost:${PORT}`);
});
