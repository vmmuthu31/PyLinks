import { Request, Response, NextFunction } from "express";
import { Merchant } from "../models/Merchant";
import { Customer } from "../models/Customer";

/**
 * Middleware to authenticate API key
 */
export async function authenticateApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const apiKey = req.headers["x-api-key"] as string;

    if (!apiKey) {
      res.status(401).json({ error: "API key is required" });
      return;
    }

    const merchant = await Merchant.findOne({ apiKey, isActive: true });

    if (!merchant) {
      res.status(401).json({ error: "Invalid API key" });
      return;
    }

    (req as any).merchant = merchant;

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware for general user authentication (for disputes, etc.)
 * This is a simplified version - in production you'd use JWT or session tokens
 */
export async function auth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // For now, we'll use a simple approach where the user info is passed in headers
    // In production, you'd validate JWT tokens or session cookies
    const userEmail = req.headers["x-user-email"] as string;
    const walletAddress = req.headers["x-wallet-address"] as string;

    if (!userEmail && !walletAddress) {
      res.status(401).json({ 
        success: false,
        message: "Authentication required" 
      });
      return;
    }

    // Try to find user as merchant or customer
    let user = null;
    let userType = null;

    if (userEmail) {
      const merchant = await Merchant.findOne({ email: userEmail });
      if (merchant) {
        user = merchant;
        userType = "merchant";
      } else {
        const customer = await Customer.findOne({ email: userEmail });
        if (customer) {
          user = customer;
          userType = "customer";
        }
      }
    }

    if (!user) {
      res.status(401).json({ 
        success: false,
        message: "User not found" 
      });
      return;
    }

    // Add user info to request
    (req as any).user = {
      ...user.toObject(),
      userType,
      walletAddress: walletAddress || user.walletAddress,
      isAdmin: false // Add admin logic here if needed
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ 
      success: false,
      message: "Authentication error" 
    });
  }
}
