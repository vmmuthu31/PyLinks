import { Router } from "express";
import { PaymentSessionService } from "../services/payment-session.service";
import { authenticateApiKey } from "../middleware/auth";
import { Payment } from "../models/Payment";

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

    return res.status(201).json({
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

    return res.json({
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

    return res.json({
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

    return res.json({
      success: true,
      count: sessions.length,
      data: sessions,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/payments/record
 * Record a completed on-chain payment
 */
router.post("/record", authenticateApiKey, async (req, res, next) => {
  try {
    const { merchantId, txHash, amount, userWallet, memo, status } = req.body;

    // Validate required fields
    if (!txHash) {
      return res.status(400).json({
        success: false,
        error: "Transaction hash is required",
      });
    }

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: "Amount is required",
      });
    }

    if (!userWallet) {
      return res.status(400).json({
        success: false,
        error: "User wallet address is required",
      });
    }

    // Verify the merchant owns this API key
    const authenticatedMerchantId = (req as any).merchant._id.toString();

    // If merchantId is provided, verify it matches the authenticated merchant
    if (merchantId && merchantId !== authenticatedMerchantId) {
      return res.status(403).json({
        success: false,
        error: "Merchant ID mismatch",
      });
    }

    // Check if payment with this txHash already exists
    const existingPayment = await Payment.findOne({ txHash });
    if (existingPayment) {
      return res.status(409).json({
        success: false,
        error: "Payment with this transaction hash already recorded",
        data: {
          paymentId: existingPayment._id,
          txHash: existingPayment.txHash,
          createdAt: existingPayment.createdAt,
        },
      });
    }

    // Create payment record
    const payment = await Payment.create({
      merchantId: authenticatedMerchantId,
      txHash,
      amount,
      userWallet,
      memo,
      status: status || "success",
    });

    return res.status(201).json({
      success: true,
      data: {
        paymentId: payment._id,
        merchantId: payment.merchantId,
        txHash: payment.txHash,
        amount: payment.amount,
        userWallet: payment.userWallet,
        memo: payment.memo,
        status: payment.status,
        createdAt: payment.createdAt,
      },
      message: "Payment recorded successfully",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/payments/records
 * Get merchant's recorded payments
 */
router.get("/records", authenticateApiKey, async (req, res, next) => {
  try {
    const { status, limit = "50", skip = "0" } = req.query;
    const merchantId = (req as any).merchant._id;

    const query: any = { merchantId };
    if (status) {
      query.status = status;
    }

    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string))
      .skip(parseInt(skip as string));

    const total = await Payment.countDocuments(query);

    return res.json({
      success: true,
      count: payments.length,
      total,
      data: payments.map((p) => ({
        paymentId: p._id,
        txHash: p.txHash,
        amount: p.amount,
        userWallet: p.userWallet,
        memo: p.memo,
        status: p.status,
        createdAt: p.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
