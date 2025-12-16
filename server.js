import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const PHONEPE_CLIENT_ID = process.env.PHONEPE_CLIENT_ID;
const PHONEPE_CLIENT_SECRET = process.env.PHONEPE_CLIENT_SECRET;
const PHONEPE_CLIENT_VERSION = process.env.PHONEPE_CLIENT_VERSION || "1";

// Health check
app.get("/", (req, res) => {
  res.send("PhonePe backend running");
});

// Create payment
app.post("/create-payment", async (req, res) => {
  try {
    const { orderId, amount } = req.body;

    if (!orderId || !amount) {
      return res.status(400).json({ error: "Missing orderId or amount" });
    }

    /* ===== 1. Generate token ===== */
    const tokenRes = await fetch("https://api.phonepe.com/v1/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: PHONEPE_CLIENT_ID,
        client_secret: PHONEPE_CLIENT_SECRET,
        client_version: PHONEPE_CLIENT_VERSION
      })
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return res.status(400).json(tokenData);
    }

    /* ===== 2. Create payment (v2) ===== */
    const payRes = await fetch("https://api.phonepe.com/checkout/v2/pay", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tokenData.access_token}`
      },
      body: JSON.stringify({
        merchantId: PHONEPE_CLIENT_ID,
        merchantOrderId: orderId,
        amount: amount * 100,
        redirectUrl: "https://attmia.com/payment-status.html",
        paymentInstrument: {
          type: "PAY_PAGE"
        }
      })
    });

    const payData = await payRes.json();

    const redirectUrl =
      payData?.data?.instrumentResponse?.redirectInfo?.url;

    if (!redirectUrl) {
      return res.status(400).json(payData);
    }

    return res.json({
      success: true,
      data: { redirectUrl }
    });

  } catch (err) {
    return res.status(500).json({
      error: err.message || "Internal server error"
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
