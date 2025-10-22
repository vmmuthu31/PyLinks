import { Request, Response, NextFunction } from "express";
import { Merchant } from "../models/Merchant";

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
