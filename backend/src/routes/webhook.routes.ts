import { Router } from "express";
import { PaymentSession } from "../models/PaymentSession";
import { WebhookService } from "../services/webhook.service";
import { authenticateApiKey } from "../middleware/auth";

const router = Router();

/**
 * POST /api/webhooks/retry/:sessionId
 * Retry webhook delivery for a specific session
 */
router.post("/retry/:sessionId", authenticateApiKey, async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const merchant = (req as any).merchant;

    const session = await PaymentSession.findOne({
      sessionId,
      merchantId: merchant._id,
    });

    if (!session) {
      return res.status(404).json({ error: "Payment session not found" });
    }

    const event =
      session.status === "paid" ? "payment.paid" : "payment.expired";
    await WebhookService.triggerPaymentWebhook(session, event);

    res.json({
      success: true,
      message: "Webhook retry initiated",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/webhooks/test
 * Send a test webhook
 */
router.post("/test", authenticateApiKey, async (req, res, next) => {
  try {
    const merchant = (req as any).merchant;

    if (!merchant.webhookUrl) {
      return res.status(400).json({
        error: "No webhook URL configured",
      });
    }

    const testPayload = {
      event: "payment.paid" as const,
      sessionId: "test_session_123",
      merchantId: merchant._id.toString(),
      amount: 10,
      currency: "PYUSD",
      status: "paid",
      txHash:
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      timestamp: new Date().toISOString(),
      metadata: { test: true },
    };

    const delivered = await WebhookService.sendWebhook(merchant, testPayload);

    res.json({
      success: delivered,
      message: delivered ? "Test webhook delivered" : "Test webhook failed",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/webhooks/failed
 * Get failed webhook deliveries
 */
router.get("/failed", authenticateApiKey, async (req, res, next) => {
  try {
    const merchant = (req as any).merchant;

    const failedSessions = await PaymentSession.find({
      merchantId: merchant._id,
      webhookDelivered: false,
      webhookAttempts: { $gt: 0 },
    }).sort({ updatedAt: -1 });

    res.json({
      success: true,
      count: failedSessions.length,
      data: failedSessions,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
