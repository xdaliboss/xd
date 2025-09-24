import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// --- Load Firebase Service Account Key ---
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "./serviceAccountKey.json";

if (!fs.existsSync(serviceAccountPath)) {
  console.error(`❌ Missing service account key file at ${serviceAccountPath}`);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

// --- Firebase Admin Initialization ---
console.log("✅ Initializing Firebase Admin SDK...");
initializeApp({
  credential: cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL, // still needs to be in .env
});

const db = getDatabase();

// --- API ROUTES ---

// Fetch user releases (SECURE)
app.get("/api/releases/:uid", async (req, res) => {
  try {
    console.log("📥 API Request: /api/releases/", req.params.uid);
    const refPath = `users/${req.params.uid}/releases`;
    console.log("🔗 Database Path:", refPath);

    const snapshot = await db.ref(refPath).get();
    console.log("📤 Snapshot exists?", snapshot.exists());

    if (!snapshot.exists()) {
      console.log("⚠️ No releases found for user:", req.params.uid);
      return res.json([]);
    }

    const data = snapshot.val();
    console.log("✅ Releases fetched:", Object.keys(data).length, "items");
    res.json(data);

  } catch (error) {
    console.error("❌ Error fetching releases:", error);
    res.status(500).json({ error: "Failed to fetch releases." });
  }
});

// Fetch user subscription (SECURE)
app.get("/api/subscription/:uid", async (req, res) => {
  try {
    console.log(`📡 [API] Fetching subscription for UID: ${req.params.uid}`);
    const snapshot = await db.ref(`users/${req.params.uid}/subscription`).get();
    res.json(snapshot.val() || {});
  } catch (error) {
    console.error("❌ Error fetching subscription:", error);
    res.status(500).json({ error: "Failed to fetch subscription." });
  }
});

// Delete user account (SECURE)
app.delete("/api/delete-account/:uid", async (req, res) => {
  try {
    console.log(`⚠️ [API] Deleting account for UID: ${req.params.uid}`);
    await db.ref(`users/${req.params.uid}`).remove();
    await getAuth().deleteUser(req.params.uid);
    res.json({ success: true });
  } catch (error) {
    console.error("❌ Error deleting account:", error);
    res.status(500).json({ error: "Failed to delete account." });
  }
});

// Serve frontend files
app.use(express.static(path.join(__dirname, "public"))); // put dashboard.html inside /public

app.listen(process.env.PORT || 3000, () => {
  console.log(`✅ Server running on port ${process.env.PORT || 3000}`);
});
