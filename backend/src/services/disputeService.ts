import { ethers } from "ethers";
import {
  Dispute,
  DisputeStatus,
  DisputeResolution,
  DisputeDocument,
} from "../models/Dispute";
import { Payment } from "../models/Payment";
import { NotificationService } from "./notificationService";
import { PyLinksCoreService } from "./pylinksCore";

export interface CreateDisputeRequest {
  paymentId: string;
  reason: string;
  description: string;
  evidence?: string[];
  customerAddress: string;
}

export interface ResolveDisputeRequest {
  disputeId: string;
  resolution: DisputeResolution;
  adminNotes?: string;
  refundAmount?: string;
}

export class DisputeService {
  private notificationService: NotificationService;
  private pylinksService: PyLinksCoreService;

  constructor() {
    this.notificationService = new NotificationService();
    // Initialize with a provider - in production, use proper signer management
    const provider = new ethers.providers.JsonRpcProvider(
      process.env.RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com"
    );
    this.pylinksService = new PyLinksCoreService(provider);
  }

  /**
   * Create a new dispute for an escrow payment
   */
  async createDispute(request: CreateDisputeRequest): Promise<DisputeDocument> {
    try {
      // Verify the payment exists and is eligible for dispute
      const payment = await Payment.findById(request.paymentId);
      if (!payment) {
        throw new Error("Payment not found");
      }

      // Note: Since the Payment model doesn't have paymentType field,
      // we'll assume all payments can be disputed for now
      // if (payment.paymentType !== "escrow") {
      //   throw new Error("Only escrow payments can be disputed");
      // }

      if (payment.status !== "success") {
        throw new Error("Payment must be successful to create a dispute");
      }

      // Check if dispute already exists
      const existingDispute = await Dispute.findOne({
        paymentId: request.paymentId,
        status: { $in: [DisputeStatus.PENDING, DisputeStatus.UNDER_REVIEW] },
      });

      if (existingDispute) {
        throw new Error("A dispute already exists for this payment");
      }

      // Create the dispute
      const dispute = new Dispute({
        paymentId: request.paymentId,
        customerAddress: request.customerAddress,
        merchantAddress: payment.merchantId.toString(), // Use merchantId instead of merchant
        reason: request.reason,
        description: request.description,
        evidence: request.evidence || [],
        amount: payment.amount,
        status: DisputeStatus.PENDING,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      });

      await dispute.save();

      // Send notifications
      await this.sendDisputeNotifications(dispute, "created");

      return dispute;
    } catch (error) {
      console.error("Error creating dispute:", error);
      throw error;
    }
  }

  /**
   * Resolve a dispute (admin action)
   */
  async resolveDispute(
    request: ResolveDisputeRequest
  ): Promise<DisputeDocument> {
    try {
      const dispute = await Dispute.findById(request.disputeId);
      if (!dispute) {
        throw new Error("Dispute not found");
      }

      if (
        dispute.status !== DisputeStatus.PENDING &&
        dispute.status !== DisputeStatus.UNDER_REVIEW
      ) {
        throw new Error("Dispute cannot be resolved in current status");
      }

      // Update dispute
      dispute.resolution = request.resolution;
      dispute.adminNotes = request.adminNotes;
      dispute.resolvedAt = new Date();
      dispute.status = DisputeStatus.RESOLVED;

      // Handle refund if applicable
      if (
        request.resolution === DisputeResolution.REFUND_CUSTOMER &&
        request.refundAmount
      ) {
        dispute.refundAmount = request.refundAmount;

        // Process refund through smart contract
        try {
          await this.processRefund(dispute, request.refundAmount);
        } catch (refundError) {
          console.error("Refund processing failed:", refundError);
          dispute.status = DisputeStatus.REFUND_FAILED;
          dispute.adminNotes = `${dispute.adminNotes}\n\nRefund failed: ${refundError}`;
        }
      }

      await dispute.save();

      // Send resolution notifications
      await this.sendDisputeNotifications(dispute, "resolved");

      return dispute;
    } catch (error) {
      console.error("Error resolving dispute:", error);
      throw error;
    }
  }

  /**
   * Get dispute by ID
   */
  async getDispute(disputeId: string): Promise<DisputeDocument | null> {
    return await Dispute.findById(disputeId).populate("paymentId");
  }

  /**
   * Get disputes for a user (customer or merchant)
   */
  async getUserDisputes(userAddress: string): Promise<DisputeDocument[]> {
    return await Dispute.find({
      $or: [{ customerAddress: userAddress }, { merchantAddress: userAddress }],
    })
      .populate("paymentId")
      .sort({ createdAt: -1 });
  }

  /**
   * Get all pending disputes (admin view)
   */
  async getPendingDisputes(): Promise<DisputeDocument[]> {
    return await Dispute.find({
      status: { $in: [DisputeStatus.PENDING, DisputeStatus.UNDER_REVIEW] },
    })
      .populate("paymentId")
      .sort({ createdAt: -1 });
  }

  /**
   * Add evidence to a dispute
   */
  async addEvidence(
    disputeId: string,
    evidence: string[],
    userAddress: string
  ): Promise<DisputeDocument> {
    const dispute = await Dispute.findById(disputeId);
    if (!dispute) {
      throw new Error("Dispute not found");
    }

    // Verify user is involved in the dispute
    if (
      dispute.customerAddress !== userAddress &&
      dispute.merchantAddress !== userAddress
    ) {
      throw new Error("Unauthorized to add evidence to this dispute");
    }

    if (
      dispute.status !== DisputeStatus.PENDING &&
      dispute.status !== DisputeStatus.UNDER_REVIEW
    ) {
      throw new Error("Cannot add evidence to resolved dispute");
    }

    dispute.evidence.push(...evidence);
    dispute.updatedAt = new Date();

    await dispute.save();

    // Notify other party about new evidence
    await this.sendDisputeNotifications(dispute, "evidence_added");

    return dispute;
  }

  /**
   * Process refund through smart contract
   */
  private async processRefund(
    dispute: DisputeDocument,
    refundAmount: string
  ): Promise<void> {
    try {
      // In a real implementation, this would interact with the smart contract
      // to release funds from escrow back to the customer

      // For now, we'll simulate the refund process
      console.log(
        `Processing refund of ${refundAmount} PYUSD for dispute ${dispute._id}`
      );

      // Update payment status
      await Payment.findByIdAndUpdate(dispute.paymentId, {
        status: "refunded",
        refundAmount: refundAmount,
        refundedAt: new Date(),
      });
    } catch (error) {
      console.error("Refund processing error:", error);
      throw new Error(`Failed to process refund: ${error}`);
    }
  }

  /**
   * Send notifications for dispute events
   */
  private async sendDisputeNotifications(
    dispute: DisputeDocument,
    event: "created" | "resolved" | "evidence_added"
  ): Promise<void> {
    try {
      const payment = await Payment.findById(dispute.paymentId);
      if (!payment) return;

      switch (event) {
        case "created":
          // Notify merchant about new dispute
          await this.notificationService.sendDisputeCreatedNotification({
            merchantAddress: dispute.merchantAddress,
            customerAddress: dispute.customerAddress,
            disputeId: dispute._id?.toString() || dispute.id,
            paymentAmount: dispute.amount,
            reason: dispute.reason,
          });
          break;

        case "resolved":
          // Notify both parties about resolution
          await this.notificationService.sendDisputeResolvedNotification({
            merchantAddress: dispute.merchantAddress,
            customerAddress: dispute.customerAddress,
            disputeId: dispute._id?.toString() || dispute.id,
            resolution: dispute.resolution!,
            refundAmount: dispute.refundAmount,
          });
          break;

        case "evidence_added":
          // Notify the other party about new evidence
          await this.notificationService.sendEvidenceAddedNotification({
            disputeId: dispute._id?.toString() || dispute.id,
            notifyAddress:
              dispute.customerAddress === dispute.customerAddress
                ? dispute.merchantAddress
                : dispute.customerAddress,
          });
          break;
      }
    } catch (error) {
      console.error("Error sending dispute notifications:", error);
      // Don't throw - notifications are not critical for dispute processing
    }
  }

  /**
   * Auto-resolve expired disputes
   */
  async processExpiredDisputes(): Promise<void> {
    try {
      const expiredDisputes = await Dispute.find({
        status: DisputeStatus.PENDING,
        expiresAt: { $lt: new Date() },
      });

      for (const dispute of expiredDisputes) {
        // Auto-resolve in favor of merchant after 7 days
        await this.resolveDispute({
          disputeId: dispute._id?.toString() || dispute.id,
          resolution: DisputeResolution.FAVOR_MERCHANT,
          adminNotes:
            "Auto-resolved: Dispute expired after 7 days with no resolution",
        });
      }

      if (expiredDisputes.length > 0) {
        console.log(`Auto-resolved ${expiredDisputes.length} expired disputes`);
      }
    } catch (error) {
      console.error("Error processing expired disputes:", error);
    }
  }
}
