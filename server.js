import express from "express";
import crypto from "crypto";
import fetch from "node-fetch";
import cors from "cors";
import { PHONEPE_CONFIG } from "./config.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Legacy PhonePe backend running");
});

/* -------- CREATE PAYMENT -------- */
app.post("/pay", async (req, res) => {
  try {
    const { amount, orderId, mobile } = req.body;

    const payload = {
      merchantId: PHONEPE_CONFIG.MERCHANT_ID,
      merchantTransactionId: orderId,
      merchantUserId: "USER_" + Date.now(),
      amount: amount * 100,
      redirectUrl: PHONEPE_CONFIG.REDIRECT_URL,
      redirectMode: "POST",
      callbackUrl: PHONEPE_CONFIG.CALLBACK_URL,
      mobileNumber: mobile || "9999999999",
      paymentInstrument: {
        type: "PAY_PAGE"
      }
    };

    const base64Payload = Buffer.from(
      JSON.stringify(payload)
    ).toString("base64");

    const checksum =
      crypto
        .createHash("sha256")
        .update(
          base64Payload +
          "/pg/v1/pay" +
          PHONEPE_CONFIG.SALT_KEY
        )
        .digest("hex") +
      "###" +
      PHONEPE_CONFIG.SALT_INDEX;

    const response = await fetch(
      PHONEPE_CONFIG.PAY_API_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": checksum
        },
        body: JSON.stringify({
          request: base64Payload
        })
      }
    );

    const data = await response.json();

    if (
      data?.data?.instrumentResponse?.redirectInfo?.url
    ) {
      return res.json({
        success: true,
        redirectUrl:
          data.data.instrumentResponse.redirectInfo.url
      });
    }

    return res.status(400).json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
;

/* -------- CALLBACK (OPTIONAL) -------- */
app.post("/callback", (req, res) => {
  console.log("PhonePe callback:", req.body);
  res.status(200).send("OK");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log("Server running on port", PORT)
);

