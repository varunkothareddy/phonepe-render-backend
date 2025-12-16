import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const CLIENT_ID = process.env.PHONEPE_CLIENT_ID;
const CLIENT_SECRET = process.env.PHONEPE_CLIENT_SECRET;
const CLIENT_VERSION = process.env.PHONEPE_CLIENT_VERSION || "1";

/* ---------- HEALTH CHECK ---------- */
app.get("/", (req, res) => {
  res.send("PhonePe backend running");
});

/* ---------- CREATE PAYMENT ---------- */
app.post("/create-payment", async (req, res) => {
  try {
    const { orderId, amount } = req.body;

    if (!orderId || !amount) {
      return res.status(400).json({ error: "Missing orderId or amount" });
    }

    /* ===== 1. GET ACCESS TOKEN ===== */
    const tokenRes = await fetch("https://api.phonepe.com/v1/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        client_version: CLIENT_VERSION
      })
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return res.status(400).json(tokenData);
    }

    /* ===== 2. CREATE CHECKOUT v2 PAYMENT ===== */
    const payRes = await fetch(
      "https://api.phonepe.com/apis/pg/checkout/v2/pay",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `O-Bearer ${tokenData.access_token}`
        },
        body: JSON.stringify({
          merchantOrderId: orderId,
          amount: amount * 100,
          paymentFlow: {
            type: "PG_CHECKOUT",
            merchantUrls: {
              redirectUrl: "https://attmia.com/payment-status.html"
            }
          }
        })
      }
    );

    const payData = await payRes.json();

    if (!payData.redirectUrl) {
      return res.status(400).json(payData);
    }

    return res.json({
      success: true,
      redirectUrl: payData.redirectUrl
    });

  } catch (err) {
    return res.status(500).json({
      error: err.message || "Internal server error"
    });
  }
});

/* ---------- START SERVER ---------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
