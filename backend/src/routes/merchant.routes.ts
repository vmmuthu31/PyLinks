import { Router } from "express";
import { randomBytes } from "crypto";
import { Merchant } from "../models/Merchant";
import { authenticateApiKey } from "../middleware/auth";

const router = Router();

/**
 * POST /api/merchants/register
 * Register a new merchant
 */
router.post("/register", async (req, res, next) => {
  try {
    const { email, name, walletAddress, webhookUrl } = req.body;

    if (!email || !name || !walletAddress) {
      return res.status(400).json({
        error: "Email, name, and wallet address are required",
      });
    }

    const existingMerchant = await Merchant.findOne({ email });
    if (existingMerchant) {
      return res.status(409).json({ error: "Merchant already exists" });
    }

    const apiKey = `pk_${randomBytes(24).toString("hex")}`;
    const apiSecret = `sk_${randomBytes(32).toString("hex")}`;
    const webhookSecret = webhookUrl
      ? randomBytes(32).toString("hex")
      : undefined;

    const merchant = await Merchant.create({
      email,
      name,
      walletAddress: walletAddress.toLowerCase(),
      apiKey,
      apiSecret,
      webhookUrl,
      webhookSecret,
    });

    console.log("Merchant created:", merchant._id); // For testing QR codes

    res.status(201).json({
      success: true,
      data: {
        _id: merchant._id,
        merchantId: merchant._id, // Keep both for backward compatibility
        email: merchant.email,
        name: merchant.name,
        walletAddress: merchant.walletAddress,
        apiKey: merchant.apiKey,
        apiSecret: merchant.apiSecret,
        webhookSecret: merchant.webhookSecret,
      },
      message:
        "Merchant registered successfully. Please save your API credentials securely.",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/merchants/login
 * Login existing merchant to retrieve API credentials
 */
router.post("/login", async (req, res, next) => {
  try {
    const { email, walletAddress } = req.body;

    if (!email) {
      return res.status(400).json({
        error: "Email is required",
      });
    }

    // Find merchant by email
    const merchant = await Merchant.findOne({ email });
    if (!merchant) {
      return res.status(404).json({
        error: "Merchant not found. Please register first.",
      });
    }

    // Optional: Verify wallet address if provided (extra security)
    if (
      walletAddress &&
      merchant.walletAddress !== walletAddress.toLowerCase()
    ) {
      return res.status(401).json({
        error: "Wallet address does not match registered merchant",
      });
    }

    console.log("Merchant login:", merchant._id, merchant.email);

    res.json({
      success: true,
      data: {
        _id: merchant._id,
        merchantId: merchant._id,
        email: merchant.email,
        name: merchant.name,
        walletAddress: merchant.walletAddress,
        apiKey: merchant.apiKey,
        apiSecret: merchant.apiSecret,
        webhookSecret: merchant.webhookSecret,
        isActive: merchant.isActive,
        createdAt: merchant.createdAt,
      },
      message: "Login successful. Please save your API credentials securely.",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/merchants/me
 * Get current merchant details
 */
router.get("/me", authenticateApiKey, async (req, res, next) => {
  try {
    const merchant = (req as any).merchant;

    res.json({
      success: true,
      data: {
        _id: merchant._id,
        merchantId: merchant._id, // Keep both for backward compatibility
        email: merchant.email,
        name: merchant.name,
        walletAddress: merchant.walletAddress,
        webhookUrl: merchant.webhookUrl,
        isActive: merchant.isActive,
        createdAt: merchant.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/merchants/webhook
 * Update webhook URL
 */
router.put("/webhook", authenticateApiKey, async (req, res, next) => {
  try {
    const { webhookUrl } = req.body;
    const merchant = (req as any).merchant;

    const webhookSecret = randomBytes(32).toString("hex");

    await Merchant.updateOne(
      { _id: merchant._id },
      { webhookUrl, webhookSecret }
    );

    res.json({
      success: true,
      data: {
        webhookUrl,
        webhookSecret,
      },
      message: "Webhook URL updated successfully",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/merchants/regenerate-keys
 * Regenerate API keys
 */
router.post("/regenerate-keys", authenticateApiKey, async (req, res, next) => {
  try {
    const merchant = (req as any).merchant;

    const newApiKey = `pk_${randomBytes(24).toString("hex")}`;
    const newApiSecret = `sk_${randomBytes(32).toString("hex")}`;

    await Merchant.updateOne(
      { _id: merchant._id },
      { apiKey: newApiKey, apiSecret: newApiSecret }
    );

    res.json({
      success: true,
      data: {
        apiKey: newApiKey,
        apiSecret: newApiSecret,
      },
      message:
        "API keys regenerated successfully. Please update your integration.",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/merchants/:id
 * Public - fetch merchant by id (used by dashboards/QR generators)
 */
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Merchant id is required" });
    }

    const merchant = await Merchant.findById(id).select(
      "_id email name walletAddress webhookUrl isActive createdAt"
    );

    if (!merchant) {
      return res.status(404).json({ error: "Merchant not found" });
    }

    res.json({
      success: true,
      data: {
        _id: merchant._id,
        merchantId: merchant._id, // Keep both for backward compatibility
        email: merchant.email,
        name: merchant.name,
        walletAddress: merchant.walletAddress,
        webhookUrl: merchant.webhookUrl,
        isActive: merchant.isActive,
        createdAt: merchant.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.put("/update-wallet", authenticateApiKey, async (req, res, next) => {
  try {
    const { walletAddress } = req.body;
    const merchant = (req as any).merchant;

    if (!walletAddress)
      return res.status(400).json({ error: "Wallet address required" });

    merchant.walletAddress = walletAddress.toLowerCase();
    await merchant.save();

    res.json({
      success: true,
      message: "Wallet updated successfully",
      data: { walletAddress: merchant.walletAddress },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
