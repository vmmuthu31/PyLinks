import { Router } from "express";
import { PaymentSessionService } from "../services/payment-session.service";
import { authenticateApiKey } from "../middleware/auth";
import { validateRequest } from "../middleware/validation";

const router = Router();

/**
 * POST /api/payments/create
 * Create a new payment session
 */
router.post("/create", authenticateApiKey, async (req, res, next) => {
  try {
    const { amount, description, currency, expiresIn, metadata } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Valid amount is required" });
    }

    const session = await PaymentSessionService.createSession({
      merchantId: (req as any).merchant._id.toString(),
      amount,
      description,
      currency,
      expiresIn,
      metadata,
    });

    res.status(201).json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/payments/:sessionId
 * Get payment session details
 */
router.get("/:sessionId", async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const session = await PaymentSessionService.getSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: "Payment session not found" });
    }

    res.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        amount: session.amount,
        currency: session.currency,
        description: session.description,
        status: session.status,
        recipientAddress: session.recipientAddress,
        txHash: session.txHash,
        expiresAt: session.expiresAt,
        paidAt: session.paidAt,
        createdAt: session.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/payments/:sessionId/verify
 * Verify payment for a session
 */
router.post("/:sessionId/verify", async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const result = await PaymentSessionService.verifySessionPayment(sessionId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/payments/merchant/sessions
 * Get merchant's payment sessions
 */
router.get("/merchant/sessions", authenticateApiKey, async (req, res, next) => {
  try {
    const { status, limit, skip } = req.query;

    const sessions = await PaymentSessionService.getMerchantSessions(
      (req as any).merchant._id.toString(),
      {
        status: status as any,
        limit: limit ? parseInt(limit as string) : undefined,
        skip: skip ? parseInt(skip as string) : undefined,
      }
    );

    res.json({
      success: true,
      count: sessions.length,
      data: sessions,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
