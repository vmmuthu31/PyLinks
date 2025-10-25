import express from "express";
import { ethers } from "ethers";
import { Merchant } from "../models/Merchant";
import { Customer } from "../models/Customer";
import { generateApiKey } from "../utils/crypto";
import { NotificationService } from "../services/notificationService";

const router = express.Router();
const notificationService = new NotificationService();

/**
 * Unified Login Endpoint
 * Handles both merchant and customer authentication
 * Creates accounts automatically if they don't exist
 */
router.post("/login", async (req, res) => {
  try {
    const {
      email,
      name,
      walletAddress,
      signature,
      message,
      timestamp,
      userType = "merchant", // default to merchant
    } = req.body;

    console.log("🔐 Auth request:", {
      email,
      name,
      userType,
      walletAddress: walletAddress ? "***" : "none",
    });

    // Validate required fields
    if (!email || !name) {
      return res.status(400).json({
        success: false,
        message: "Email and name are required",
      });
    }

    // Validate signature if wallet is provided
    if (walletAddress && signature && message) {
      try {
        const recoveredAddress = ethers.utils.verifyMessage(message, signature);
        if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
          return res.status(401).json({
            success: false,
            message: "Invalid wallet signature",
          });
        }
        console.log("✅ Wallet signature verified");
      } catch (error) {
        console.error("❌ Signature verification failed:", error);
        return res.status(401).json({
          success: false,
          message: "Signature verification failed",
        });
      }
    }

    let userData;
    let isNewUser = false;

    if (userType === "merchant") {
      // Handle merchant authentication
      let merchant = await Merchant.findOne({ email });

      if (!merchant) {
        // Create new merchant
        const merchantId = `merchant_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        const apiKey = generateApiKey();

        merchant = new Merchant({
          merchantId,
          name,
          email,
          walletAddress: walletAddress || null,
          apiKey,
        });

        await merchant.save();
        console.log("✅ New merchant created:", merchantId);
        isNewUser = true;
      } else {
        // Update existing merchant
        if (walletAddress && !merchant.walletAddress) {
          merchant.walletAddress = walletAddress;
          await merchant.save();
          console.log("✅ Merchant wallet updated");
        }
      }

      userData = {
        _id: merchant._id,
        merchantId: merchant._id,
        name: merchant.name,
        email: merchant.email,
        walletAddress: merchant.walletAddress,
        apiKey: merchant.apiKey,
        createdAt: merchant.createdAt,
        updatedAt: merchant.updatedAt,
      };
    } else {
      // Handle customer authentication
      let customer = await Customer.findOne({ email });

      if (!customer) {
        // Create new customer
        const customerId = `customer_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;

        customer = new Customer({
          customerId,
          name,
          email,
          walletAddress: walletAddress || null,
        });

        await customer.save();
        console.log("✅ New customer created:", customerId);
        isNewUser = true;
      } else {
        // Update existing customer
        if (walletAddress && !customer.walletAddress) {
          customer.walletAddress = walletAddress;
          await customer.save();
          console.log("✅ Customer wallet updated");
        }
      }

      userData = {
        _id: customer._id,
        customerId: customer.customerId,
        name: customer.name,
        email: customer.email,
        walletAddress: customer.walletAddress,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
      };
    }

    // Send welcome email for new users
    if (isNewUser) {
      try {
        await notificationService.sendWelcomeEmail({
          email,
          name,
          userType: userType as "merchant" | "customer",
          walletAddress: walletAddress || undefined,
        });
        console.log(`✅ Welcome email sent to new ${userType}: ${email}`);
      } catch (emailError) {
        console.error(`❌ Failed to send welcome email to ${email}:`, emailError);
        // Don't fail the authentication if email fails
      }
    }

    res.json({
      success: true,
      message: `${userType} authentication successful`,
      data: userData,
    });
  } catch (error) {
    console.error("❌ Auth error:", error);
    res.status(500).json({
      success: false,
      message: "Authentication failed",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
});

/**
 * Get merchant by ID (for payment pages)
 */
router.get("/merchants/:merchantId", async (req, res) => {
  try {
    const { merchantId } = req.params;

    const merchant = await Merchant.findOne({
      $or: [{ merchantId }, { _id: merchantId }],
    });

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: "Merchant not found",
      });
    }

    // Return public merchant info (no API key)
    res.json({
      success: true,
      data: {
        _id: merchant._id,
        merchantId: merchant._id,
        name: merchant.name,
        email: merchant.email,
        walletAddress: merchant.walletAddress,
      },
    });
  } catch (error) {
    console.error("❌ Get merchant error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch merchant",
    });
  }
});

export default router;
