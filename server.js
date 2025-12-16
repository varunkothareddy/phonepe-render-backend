import express from "express";
import fetch from "node-fetch";

const app = express();

// 🔥 FULL CORS HANDLING (FINAL)
app.use((req, res, next) => {
  const allowedOrigins = [
    "https://attmia.com",
    "https://www.attmia.com"
  ];

  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  // ✅ VERY IMPORTANT: handle preflight
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

app.use(express.json());


const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

/* ---------- HEALTH CHECK ---------- */
app.get("/", (req, res) => {
  res.send("Razorpay backend running");
});

/* ---------- CREATE ORDER ---------- */
app.post("/create-order", async (req, res) => {
  try {
    const { amount } = req.body;

    const order = await razorpay.orders.create({
      amount: amount * 100, // paisa
      currency: "INR",
      receipt: "rcpt_" + Date.now()
    });

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------- VERIFY PAYMENT ---------- */
app.post("/verify", (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  } = req.body;

  const body = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (expectedSignature === razorpay_signature) {
    res.json({ success: true });
  } else {
    res.status(400).json({ success: false });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});


