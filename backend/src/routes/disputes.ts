import express from "express";
import { DisputeService } from "../services/disputeService";
import { auth } from "../middleware/auth";
import { validateRequest } from "../middleware/validation";
import { AuthenticatedRequest } from "../types";
import { z } from "zod";

const router = express.Router();
const disputeService = new DisputeService();

// Validation schemas
const createDisputeSchema = z.object({
  paymentId: z.string().min(1, "Payment ID is required"),
  reason: z.enum([
    "product_not_received",
    "product_defective",
    "service_not_provided",
    "unauthorized_charge",
    "duplicate_charge",
    "billing_error",
    "other",
  ]),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(2000),
  evidence: z.array(z.string()).optional(),
});

const resolveDisputeSchema = z.object({
  resolution: z.enum([
    "favor_merchant",
    "favor_customer",
    "partial_refund",
    "refund_customer",
  ]),
  adminNotes: z.string().optional(),
  refundAmount: z.string().optional(),
});

const addEvidenceSchema = z.object({
  evidence: z
    .array(z.string().max(500))
    .min(1, "At least one piece of evidence is required"),
});

/**
 * @route POST /api/disputes
 * @desc Create a new dispute
 * @access Private (Customer only)
 */
router.post(
  "/",
  auth,
  validateRequest(createDisputeSchema),
  async (req, res) => {
    try {
      const { paymentId, reason, description, evidence } = req.body;
      const customerAddress = (req as AuthenticatedRequest).user.walletAddress;

      if (!customerAddress) {
        return res.status(400).json({
          success: false,
          message: "Wallet address is required to create a dispute",
        });
      }

      const dispute = await disputeService.createDispute({
        paymentId,
        reason,
        description,
        evidence,
        customerAddress,
      });

      res.status(201).json({
        success: true,
        message: "Dispute created successfully",
        data: dispute,
      });
    } catch (error: any) {
      console.error("Create dispute error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to create dispute",
      });
    }
  }
);

/**
 * @route GET /api/disputes
 * @desc Get user's disputes
 * @access Private
 */
router.get("/", auth, async (req, res) => {
  try {
    const userAddress = (req as AuthenticatedRequest).user.walletAddress;

    if (!userAddress) {
      return res.status(400).json({
        success: false,
        message: "Wallet address is required",
      });
    }

    const disputes = await disputeService.getUserDisputes(userAddress);

    res.json({
      success: true,
      data: disputes,
    });
  } catch (error: any) {
    console.error("Get disputes error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch disputes",
    });
  }
});

/**
 * @route GET /api/disputes/:id
 * @desc Get specific dispute
 * @access Private
 */
router.get("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userAddress = (req as AuthenticatedRequest).user.walletAddress;

    const dispute = await disputeService.getDispute(id);

    if (!dispute) {
      return res.status(404).json({
        success: false,
        message: "Dispute not found",
      });
    }

    // Check if user is involved in the dispute
    if (
      dispute.customerAddress !== userAddress &&
      dispute.merchantAddress !== userAddress
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to view this dispute",
      });
    }

    res.json({
      success: true,
      data: dispute,
    });
  } catch (error: any) {
    console.error("Get dispute error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dispute",
    });
  }
});

/**
 * @route POST /api/disputes/:id/evidence
 * @desc Add evidence to a dispute
 * @access Private
 */
router.post(
  "/:id/evidence",
  auth,
  validateRequest(addEvidenceSchema),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { evidence } = req.body;
      const userAddress = (req as AuthenticatedRequest).user.walletAddress;

      if (!userAddress) {
        return res.status(400).json({
          success: false,
          message: "Wallet address is required",
        });
      }

      const dispute = await disputeService.addEvidence(
        id,
        evidence,
        userAddress
      );

      res.json({
        success: true,
        message: "Evidence added successfully",
        data: dispute,
      });
    } catch (error: any) {
      console.error("Add evidence error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to add evidence",
      });
    }
  }
);

/**
 * @route GET /api/disputes/admin/pending
 * @desc Get all pending disputes (Admin only)
 * @access Private (Admin)
 */
router.get("/admin/pending", auth, async (req, res) => {
  try {
    // Check if user is admin (implement your admin check logic)
    if (!(req as AuthenticatedRequest).user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const disputes = await disputeService.getPendingDisputes();

    res.json({
      success: true,
      data: disputes,
    });
  } catch (error: any) {
    console.error("Get pending disputes error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending disputes",
    });
  }
});

/**
 * @route POST /api/disputes/:id/resolve
 * @desc Resolve a dispute (Admin only)
 * @access Private (Admin)
 */
router.post(
  "/:id/resolve",
  auth,
  validateRequest(resolveDisputeSchema),
  async (req, res) => {
    try {
      // Check if user is admin
      if (!(req as AuthenticatedRequest).user.isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Admin access required",
        });
      }

      const { id } = req.params;
      const { resolution, adminNotes, refundAmount } = req.body;

      const dispute = await disputeService.resolveDispute({
        disputeId: id,
        resolution,
        adminNotes,
        refundAmount,
      });

      res.json({
        success: true,
        message: "Dispute resolved successfully",
        data: dispute,
      });
    } catch (error: any) {
      console.error("Resolve dispute error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to resolve dispute",
      });
    }
  }
);

/**
 * @route POST /api/disputes/admin/process-expired
 * @desc Process expired disputes (Admin/Cron job)
 * @access Private (Admin)
 */
router.post("/admin/process-expired", auth, async (req, res) => {
  try {
    // Check if user is admin or if this is a valid cron job request
    if (
      !(req as AuthenticatedRequest).user.isAdmin &&
      req.headers["x-cron-secret"] !== process.env.CRON_SECRET
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    await disputeService.processExpiredDisputes();

    res.json({
      success: true,
      message: "Expired disputes processed successfully",
    });
  } catch (error: any) {
    console.error("Process expired disputes error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process expired disputes",
    });
  }
});

export default router;
