import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import admin from "firebase-admin";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// --- Firebase Admin Initialization ---
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = admin.database();
const auth = admin.auth();

// --- Routes ---

app.post("/user/:uid", async (req, res) => {
  try {
    const uid = req.params.uid;
    const ref = db.ref(`users/${uid}`);
    const snapshot = await ref.get();

    if (!snapshot.exists()) {
      await ref.set({
        accountStatus: "active",
        subscription: { plan1: 0, plan2: 0, plan3: 0, custom: 0 }
      });
    }
    res.json({ message: "User created/verified in database." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Signup
app.post("/auth/signup", async (req, res) => {
  try {
    const { email, password } = req.body;
    const userRecord = await auth.createUser({ email, password });

    await db.ref(`users/${userRecord.uid}`).set({
      accountStatus: "active",
      subscription: { plan1: 0, plan2: 0, plan3: 0, custom: 0 }
    });

    // Send email verification link
    const link = await auth.generateEmailVerificationLink(email);
    res.status(201).json({ message: "User created. Verify email.", verifyLink: link });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// Login
app.post("/auth/login", async (req, res) => {
  // NOTE: Firebase Admin SDK cannot verify password directly.
  // Normally, you'd use Firebase Client SDK for password verification,
  // or implement a custom token workflow.
  res.status(501).json({ error: "Login must be handled by client SDK." });
});

// Fetch user data
app.get("/user/:uid", async (req, res) => {
  try {
    const snapshot = await db.ref(`users/${req.params.uid}`).get();
    if (!snapshot.exists()) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(snapshot.val());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("API is running!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
