import nodemailer from "nodemailer";
import { DisputeResolution } from "../models/Dispute";

export interface DisputeCreatedNotification {
  merchantAddress: string;
  customerAddress: string;
  disputeId: string;
  paymentAmount: string;
  reason: string;
}

export interface DisputeResolvedNotification {
  merchantAddress: string;
  customerAddress: string;
  disputeId: string;
  resolution: DisputeResolution;
  refundAmount?: string;
}

export interface EvidenceAddedNotification {
  disputeId: string;
  notifyAddress: string;
}

export interface PaymentNotification {
  recipientAddress: string;
  amount: string;
  senderAddress: string;
  paymentId: string;
  type: "received" | "sent" | "escrow_created" | "escrow_released";
}

export interface WelcomeEmailNotification {
  email: string;
  name: string;
  userType: "merchant" | "customer";
  walletAddress?: string;
}

export class NotificationService {
  private transporter: nodemailer.Transporter;
  private fromEmail: string;

  constructor() {
    this.fromEmail = process.env.SMTP_USER || "noreply@pylinks.io";

    // Configure nodemailer transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Verify transporter configuration
    this.verifyTransporter();
  }

  private async verifyTransporter(): Promise<void> {
    try {
      await this.transporter.verify();
      console.log("✅ Email transporter is ready");
    } catch (error) {
      console.error("❌ Email transporter verification failed:", error);
    }
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(data: WelcomeEmailNotification): Promise<void> {
    try {
      const subject = `🎉 Welcome to PyLinks - Your ${
        data.userType === "merchant" ? "Merchant" : "Customer"
      } Account is Ready!`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to PyLinks!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Seamless PYUSD payments for everyone</p>
          </div>
          
          <div style="padding: 40px 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-bottom: 20px;">Hello ${
              data.name
            }! 👋</h2>
            
            <div style="background: white; padding: 25px; border-radius: 12px; margin-bottom: 25px; border-left: 4px solid #667eea;">
              <h3 style="margin-top: 0; color: #667eea;">Your Account Details</h3>
              <p><strong>Account Type:</strong> ${
                data.userType === "merchant" ? "Merchant" : "Customer"
              }</p>
              <p><strong>Email:</strong> ${data.email}</p>
              ${
                data.walletAddress
                  ? `<p><strong>Wallet:</strong> ${data.walletAddress}</p>`
                  : ""
              }
            </div>

            ${
              data.userType === "merchant"
                ? `
              <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                <h3 style="margin-top: 0; color: #1976d2;">🏪 Merchant Features Available:</h3>
                <ul style="margin: 0; padding-left: 20px; color: #333;">
                  <li>Create payment links and QR codes</li>
                  <li>Accept PYUSD payments with low fees</li>
                  <li>Real-time payment notifications</li>
                  <li>Comprehensive analytics dashboard</li>
                  <li>Bulk payment processing</li>
                  <li>Escrow payment protection</li>
                </ul>
              </div>
            `
                : `
              <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                <h3 style="margin-top: 0; color: #2e7d32;">💳 Customer Features Available:</h3>
                <ul style="margin: 0; padding-left: 20px; color: #333;">
                  <li>Secure PYUSD payments</li>
                  <li>Transaction history tracking</li>
                  <li>QR code payment scanning</li>
                  <li>Dispute resolution support</li>
                  <li>Loyalty rewards program</li>
                </ul>
              </div>
            `
            }

            <div style="background: #fff3e0; border: 1px solid #ffb74d; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <h3 style="margin-top: 0; color: #f57c00;">🚀 Getting Started</h3>
              <p style="margin: 0; color: #333;">
                ${
                  data.userType === "merchant"
                    ? "Visit your merchant dashboard to create your first payment link and start accepting PYUSD payments instantly!"
                    : "You can now make secure payments using PYUSD. Look for PyLinks QR codes or payment links from merchants."
                }
              </p>
            </div>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/${
        data.userType === "merchant" ? "dashboard" : "customer-dashboard"
      }" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                ${
                  data.userType === "merchant"
                    ? "Access Merchant Dashboard"
                    : "Access Customer Portal"
                }
              </a>
            </div>
          </div>
          
          <div style="background: #333; color: white; padding: 25px; text-align: center;">
            <h3 style="margin-top: 0;">Need Help?</h3>
            <p style="margin: 10px 0;">Our support team is here to help you get the most out of PyLinks.</p>
            <p style="margin: 0;">
              <a href="${
                process.env.FRONTEND_URL
              }/support" style="color: #667eea;">Contact Support</a> | 
              <a href="${
                process.env.FRONTEND_URL
              }/docs" style="color: #667eea;">Documentation</a>
            </p>
          </div>
          
          <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
            <p>This is an automated welcome email from PyLinks. Please do not reply to this email.</p>
            <p>© 2024 PyLinks. All rights reserved.</p>
          </div>
        </div>
      `;

      await this.transporter.sendMail({
        from: this.fromEmail,
        to: data.email,
        subject,
        html,
      });

      console.log(`✅ Welcome email sent to ${data.email}`);
    } catch (error) {
      console.error("❌ Error sending welcome email:", error);
    }
  }

  /**
   * Send dispute created notification to merchant
   */
  async sendDisputeCreatedNotification(
    data: DisputeCreatedNotification
  ): Promise<void> {
    try {
      const merchantEmail = await this.getEmailForAddress(data.merchantAddress);
      if (!merchantEmail) {
        console.log(`No email found for merchant ${data.merchantAddress}`);
        return;
      }

      const subject = "🚨 New Dispute Created - PyLinks";
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">PyLinks Dispute Alert</h1>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-bottom: 20px;">New Dispute Created</h2>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <p><strong>Dispute ID:</strong> ${data.disputeId}</p>
              <p><strong>Payment Amount:</strong> $${data.paymentAmount} PYUSD</p>
              <p><strong>Customer:</strong> ${data.customerAddress}</p>
              <p><strong>Reason:</strong> ${data.reason}</p>
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 0; color: #856404;">
                <strong>Action Required:</strong> A customer has created a dispute for one of your payments. 
                Please review the dispute and provide any necessary evidence within 7 days.
              </p>
            </div>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/dashboard/disputes/${data.disputeId}" 
                 style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View Dispute Details
              </a>
            </div>
          </div>
          
          <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
            <p>This is an automated notification from PyLinks. Please do not reply to this email.</p>
          </div>
        </div>
      `;

      await this.transporter.sendMail({
        from: this.fromEmail,
        to: merchantEmail,
        subject,
        html,
      });

      console.log(`✅ Dispute created notification sent to ${merchantEmail}`);
    } catch (error) {
      console.error("❌ Error sending dispute created notification:", error);
    }
  }

  /**
   * Send dispute resolved notification to both parties
   */
  async sendDisputeResolvedNotification(
    data: DisputeResolvedNotification
  ): Promise<void> {
    try {
      const [merchantEmail, customerEmail] = await Promise.all([
        this.getEmailForAddress(data.merchantAddress),
        this.getEmailForAddress(data.customerAddress),
      ]);

      const subject = "✅ Dispute Resolved - PyLinks";

      const getResolutionMessage = (
        resolution: DisputeResolution,
        isCustomer: boolean
      ) => {
        switch (resolution) {
          case DisputeResolution.FAVOR_MERCHANT:
            return isCustomer
              ? "The dispute has been resolved in favor of the merchant. No refund will be issued."
              : "The dispute has been resolved in your favor. No refund is required.";
          case DisputeResolution.FAVOR_CUSTOMER:
            return isCustomer
              ? "The dispute has been resolved in your favor. You will receive a full refund."
              : "The dispute has been resolved in favor of the customer. A refund has been processed.";
          case DisputeResolution.PARTIAL_REFUND:
            return isCustomer
              ? `The dispute has been resolved with a partial refund of $${data.refundAmount} PYUSD.`
              : `The dispute has been resolved with a partial refund of $${data.refundAmount} PYUSD to the customer.`;
          case DisputeResolution.REFUND_CUSTOMER:
            return isCustomer
              ? `The dispute has been resolved. You will receive a refund of $${data.refundAmount} PYUSD.`
              : `The dispute has been resolved. A refund of $${data.refundAmount} PYUSD has been processed.`;
          default:
            return "The dispute has been resolved.";
        }
      };

      // Send to merchant
      if (merchantEmail) {
        const merchantHtml = this.generateDisputeResolvedEmail(
          data.disputeId,
          getResolutionMessage(data.resolution, false),
          false
        );

        await this.transporter.sendMail({
          from: this.fromEmail,
          to: merchantEmail,
          subject,
          html: merchantHtml,
        });
      }

      // Send to customer
      if (customerEmail) {
        const customerHtml = this.generateDisputeResolvedEmail(
          data.disputeId,
          getResolutionMessage(data.resolution, true),
          true
        );

        await this.transporter.sendMail({
          from: this.fromEmail,
          to: customerEmail,
          subject,
          html: customerHtml,
        });
      }

      console.log(
        `✅ Dispute resolved notifications sent for dispute ${data.disputeId}`
      );
    } catch (error) {
      console.error("❌ Error sending dispute resolved notification:", error);
    }
  }

  /**
   * Send evidence added notification
   */
  async sendEvidenceAddedNotification(
    data: EvidenceAddedNotification
  ): Promise<void> {
    try {
      const email = await this.getEmailForAddress(data.notifyAddress);
      if (!email) {
        console.log(`No email found for address ${data.notifyAddress}`);
        return;
      }

      const subject = "📎 New Evidence Added to Dispute - PyLinks";
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">PyLinks Dispute Update</h1>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-bottom: 20px;">New Evidence Added</h2>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <p>New evidence has been added to dispute <strong>${data.disputeId}</strong>.</p>
              <p>Please review the updated information and provide any additional evidence if necessary.</p>
            </div>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/dashboard/disputes/${data.disputeId}" 
                 style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View Dispute
              </a>
            </div>
          </div>
          
          <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
            <p>This is an automated notification from PyLinks.</p>
          </div>
        </div>
      `;

      await this.transporter.sendMail({
        from: this.fromEmail,
        to: email,
        subject,
        html,
      });

      console.log(`✅ Evidence added notification sent to ${email}`);
    } catch (error) {
      console.error("❌ Error sending evidence added notification:", error);
    }
  }

  /**
   * Send payment notification
   */
  async sendPaymentNotification(data: PaymentNotification): Promise<void> {
    try {
      const email = await this.getEmailForAddress(data.recipientAddress);
      if (!email) {
        console.log(`No email found for address ${data.recipientAddress}`);
        return;
      }

      const getSubjectAndMessage = (type: string) => {
        switch (type) {
          case "received":
            return {
              subject: "💰 Payment Received - PyLinks",
              message: `You have received a payment of $${data.amount} PYUSD from ${data.senderAddress}.`,
            };
          case "sent":
            return {
              subject: "📤 Payment Sent - PyLinks",
              message: `You have successfully sent $${data.amount} PYUSD to ${data.senderAddress}.`,
            };
          case "escrow_created":
            return {
              subject: "🔒 Escrow Payment Created - PyLinks",
              message: `An escrow payment of $${data.amount} PYUSD has been created. Funds will be held securely until release conditions are met.`,
            };
          case "escrow_released":
            return {
              subject: "🔓 Escrow Payment Released - PyLinks",
              message: `Escrow payment of $${data.amount} PYUSD has been released and transferred to your account.`,
            };
          default:
            return {
              subject: "📋 Payment Update - PyLinks",
              message: `Payment update for $${data.amount} PYUSD.`,
            };
        }
      };

      const { subject, message } = getSubjectAndMessage(data.type);

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">PyLinks Payment</h1>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-bottom: 20px;">Payment Notification</h2>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <p>${message}</p>
              <p><strong>Payment ID:</strong> ${data.paymentId}</p>
              <p><strong>Amount:</strong> $${data.amount} PYUSD</p>
            </div>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/dashboard/payments/history" 
                 style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View Payment Details
              </a>
            </div>
          </div>
          
          <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
            <p>This is an automated notification from PyLinks.</p>
          </div>
        </div>
      `;

      await this.transporter.sendMail({
        from: this.fromEmail,
        to: email,
        subject,
        html,
      });

      console.log(`✅ Payment notification sent to ${email}`);
    } catch (error) {
      console.error("❌ Error sending payment notification:", error);
    }
  }

  /**
   * Generate dispute resolved email HTML
   */
  private generateDisputeResolvedEmail(
    disputeId: string,
    message: string,
    isCustomer: boolean
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Dispute Resolved</h1>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">Resolution Update</h2>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p><strong>Dispute ID:</strong> ${disputeId}</p>
            <p>${message}</p>
          </div>
          
          <div style="background: #d1fae5; border: 1px solid #10b981; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0; color: #065f46;">
              <strong>Resolution Complete:</strong> This dispute has been officially resolved. 
              If you have any questions, please contact our support team.
            </p>
          </div>
          
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/dashboard/disputes/${disputeId}" 
               style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Dispute Details
            </a>
          </div>
        </div>
        
        <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
          <p>This is an automated notification from PyLinks.</p>
        </div>
      </div>
    `;
  }

  /**
   * Get email address for a wallet address (mock implementation)
   * In production, this would query your user database
   */
  private async getEmailForAddress(address: string): Promise<string | null> {
    try {
      // This is a mock implementation
      // In production, you would query your user database to get the email
      // associated with the wallet address

      // For now, return a mock email for testing
      if (process.env.NODE_ENV === "development") {
        return process.env.TEST_EMAIL || "test@pylinks.io";
      }

      // In production, implement actual database lookup
      // const user = await User.findOne({ walletAddress: address });
      // return user?.email || null;

      return null;
    } catch (error) {
      console.error("Error getting email for address:", error);
      return null;
    }
  }
}
