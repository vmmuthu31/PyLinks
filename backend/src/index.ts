import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import paymentRoutes from "./routes/payment.routes";
import merchantRoutes from "./routes/merchant.routes";
import webhookRoutes from "./routes/webhook.routes";
import authRoutes from "./routes/auth.routes";
import disputeRoutes from "./routes/disputes";
import { startBlockchainListener } from "./services/blockchain-listener";
import { errorHandler } from "./middleware/error-handler";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  res.json({
    name: "PyLinks API",
    version: "1.0.0",
    description: "PYUSD Payment Infrastructure",
  });
});

app.get("/health", (_req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.use("/api/payments", paymentRoutes);
app.use("/api/merchants", merchantRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/disputes", disputeRoutes);

app.use(errorHandler);

const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/pylinks"
    );
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`🚀 PyLinks Backend running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
  });

  startBlockchainListener();
};

startServer();

export default app;
