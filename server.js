import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const {
  PHONEPE_CLIENT_ID,
  PHONEPE_CLIENT_SECRET,
  PHONEPE_CLIENT_VERSION
} = process.env;

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

    // 1️⃣ Generate token
    const tokenRes = await fetch(
      "https://api.phonepe.com/apis/identity-manager/v1/oauth/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: PHONEPE_CLIENT_ID,
          client_secret: PHONEPE_CLIENT_SECRET,
          client_version: PHONEPE_CLIENT_VERSION
        })
      }
    );

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return res.status(400).json(tokenData);
    }

    // 2️⃣ Create payment
    const payRes = await fetch(
      "https://api.phonepe.com/checkout/v2/pay",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${tokenData.access_token}`
        },
        body: JSON.stringify({
          merchantId: PHONEPE_CLIENT_ID,
          merchantOrderId: orderId,
          amount: amount * 100,
          redirectUrl: "https://attmia.com/payment-status.html"
        })
      }
    );

    const payData = await payRes.json();
    res.json(payData);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

