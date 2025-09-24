import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// --- Firebase Admin Initialization ---
initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});

const db = getDatabase();

// --- API ROUTES ---

// Fetch user releases (SECURE)
app.get("/api/releases/:uid", async (req, res) => {
  try {
    const snapshot = await db.ref(`users/${req.params.uid}/releases`).get();
    if (!snapshot.exists()) return res.json([]);
    res.json(snapshot.val());
  } catch (error) {
    console.error("Error fetching releases:", error);
    res.status(500).json({ error: "Failed to fetch releases." });
  }
});

// Fetch user subscription (SECURE)
app.get("/api/subscription/:uid", async (req, res) => {
  try {
    const snapshot = await db.ref(`users/${req.params.uid}/subscription`).get();
    res.json(snapshot.val() || {});
  } catch (error) {
    console.error("Error fetching subscription:", error);
    res.status(500).json({ error: "Failed to fetch subscription." });
  }
});

// Delete user account (secure)
app.delete("/api/delete-account/:uid", async (req, res) => {
  try {
    await db.ref(`users/${req.params.uid}`).remove();
    await getAuth().deleteUser(req.params.uid);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({ error: "Failed to delete account." });
  }
});

// Serve frontend files
app.use(express.static(path.join(__dirname, "public"))); // put dashboard.html inside /public

app.listen(process.env.PORT || 3000, () => {
  console.log(`✅ Server running on port ${process.env.PORT || 3000}`);
});