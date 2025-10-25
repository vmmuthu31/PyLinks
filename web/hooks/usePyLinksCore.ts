import { useState, useEffect, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import { PyLinksCoreService, PaymentDetails, SubscriptionDetails, AffiliateDetails, BulkPaymentRequest, BulkPaymentToSingleRequest, BulkEscrowPaymentRequest, BulkBatchDetails } from '@/lib/contracts/pylinks-core';
import { toast } from 'sonner';

interface UsePyLinksCoreReturn {
  service: PyLinksCoreService | null;
  loading: boolean;
  error: string | null;
  
  // Payment functions
  createPayment: (request: any) => Promise<string | null>;
  processPayment: (paymentId: number) => Promise<boolean>;
  getPayment: (paymentId: number) => Promise<PaymentDetails | null>;
  
  // Bulk payment functions
  bulkPaySingleMerchant: (request: BulkPaymentToSingleRequest) => Promise<{ batchId: number; paymentIds: number[] } | null>;
  bulkPayMultipleMerchants: (requests: BulkPaymentRequest[]) => Promise<{ batchId: number; paymentIds: number[] } | null>;
  bulkCreateEscrowPayments: (request: BulkEscrowPaymentRequest) => Promise<{ batchId: number; paymentIds: number[] } | null>;
  processBulkEscrowBatch: (batchId: number) => Promise<boolean>;
  getBulkBatch: (batchId: number) => Promise<BulkBatchDetails | null>;
  getBulkBatchPayments: (batchId: number) => Promise<number[]>;
  getCustomerBulkBatches: (customer: string) => Promise<number[]>;
  
  // Subscription functions
  createSubscription: (request: any) => Promise<number | null>;
  processSubscriptionPayment: (subscriptionId: number) => Promise<boolean>;
  getSubscription: (subscriptionId: number) => Promise<SubscriptionDetails | null>;
  
  // Affiliate functions
  registerAffiliate: (name: string, code: string) => Promise<boolean>;
  getAffiliate: (wallet: string) => Promise<AffiliateDetails | null>;
  withdrawAffiliateEarnings: () => Promise<boolean>;
  
  // Utility functions
  getSpinCredits: (user: string) => Promise<string>;
  getLoyaltyPoints: (user: string) => Promise<string>;
  getMerchantEarnings: (merchant: string) => Promise<string>;
  getAffiliateEarnings: (affiliate: string) => Promise<string>;
  getCustomerPayments: (customer: string) => Promise<number[]>;
  
  // Refresh data
  refresh: () => void;
}

export function usePyLinksCore(): UsePyLinksCoreReturn {
  const { ready, user } = usePrivy();
  const [service, setService] = useState<PyLinksCoreService | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize service when wallet is connected
  useEffect(() => {
    if (ready && user?.wallet?.address && window.ethereum) {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const pyLinksService = new PyLinksCoreService(signer);
        setService(pyLinksService);
        setError(null);
      } catch (err: any) {
        setError(`Failed to initialize PyLinksCore service: ${err.message}`);
        console.error('PyLinksCore initialization error:', err);
      }
    } else {
      setService(null);
    }
  }, [ready, user]);

  // Generic error handler
  const handleError = useCallback((error: any, operation: string) => {
    const message = error.message || 'Unknown error occurred';
    setError(`${operation} failed: ${message}`);
    console.error(`${operation} error:`, error);
    toast.error(`${operation} failed: ${message}`);
    return false;
  }, []);

  // Payment functions
  const createPayment = useCallback(async (request: any): Promise<string | null> => {
    if (!service) {
      toast.error('PyLinksCore service not initialized');
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      
      const tx = await service.createPayment(request);
      toast.success('Payment creation submitted...');
      
      const receipt = await tx.wait();
      toast.success('Payment created successfully!');
      
      return receipt.transactionHash;
    } catch (error: any) {
      handleError(error, 'Create payment');
      return null;
    } finally {
      setLoading(false);
    }
  }, [service, handleError]);

  const processPayment = useCallback(async (paymentId: number): Promise<boolean> => {
    if (!service) {
      toast.error('PyLinksCore service not initialized');
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      
      const tx = await service.processPayment(paymentId);
      toast.success('Payment processing submitted...');
      
      await tx.wait();
      toast.success('Payment processed successfully!');
      
      return true;
    } catch (error: any) {
      return handleError(error, 'Process payment');
    } finally {
      setLoading(false);
    }
  }, [service, handleError]);

  const getPayment = useCallback(async (paymentId: number): Promise<PaymentDetails | null> => {
    if (!service) return null;

    try {
      return await service.getPayment(paymentId);
    } catch (error: any) {
      handleError(error, 'Get payment');
      return null;
    }
  }, [service, handleError]);

  // Subscription functions
  const createSubscription = useCallback(async (request: any): Promise<number | null> => {
    if (!service) {
      toast.error('PyLinksCore service not initialized');
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      
      const tx = await service.createSubscription(request);
      toast.success('Subscription creation submitted...');
      
      const receipt = await tx.wait();
      
      // Extract subscription ID from events
      const event = receipt.events?.find((e: any) => e.event === 'SubscriptionCreated');
      const subscriptionId = event?.args?.subscriptionId?.toNumber();
      
      toast.success('Subscription created successfully!');
      return subscriptionId || null;
    } catch (error: any) {
      handleError(error, 'Create subscription');
      return null;
    } finally {
      setLoading(false);
    }
  }, [service, handleError]);

  const processSubscriptionPayment = useCallback(async (subscriptionId: number): Promise<boolean> => {
    if (!service) {
      toast.error('PyLinksCore service not initialized');
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      
      const tx = await service.processSubscriptionPayment(subscriptionId);
      toast.success('Subscription payment submitted...');
      
      await tx.wait();
      toast.success('Subscription payment processed!');
      
      return true;
    } catch (error: any) {
      return handleError(error, 'Process subscription payment');
    } finally {
      setLoading(false);
    }
  }, [service, handleError]);

  const getSubscription = useCallback(async (subscriptionId: number): Promise<SubscriptionDetails | null> => {
    if (!service) return null;

    try {
      return await service.getSubscription(subscriptionId);
    } catch (error: any) {
      handleError(error, 'Get subscription');
      return null;
    }
  }, [service, handleError]);

  // Affiliate functions
  const registerAffiliate = useCallback(async (name: string, code: string): Promise<boolean> => {
    if (!service) {
      toast.error('PyLinksCore service not initialized');
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      
      const tx = await service.registerAffiliate(name, code);
      toast.success('Affiliate registration submitted...');
      
      await tx.wait();
      toast.success('Successfully registered as affiliate!');
      
      return true;
    } catch (error: any) {
      return handleError(error, 'Register affiliate');
    } finally {
      setLoading(false);
    }
  }, [service, handleError]);

  const getAffiliate = useCallback(async (wallet: string): Promise<AffiliateDetails | null> => {
    if (!service) return null;

    try {
      return await service.getAffiliate(wallet);
    } catch (error: any) {
      handleError(error, 'Get affiliate');
      return null;
    }
  }, [service, handleError]);

  const withdrawAffiliateEarnings = useCallback(async (): Promise<boolean> => {
    if (!service) {
      toast.error('PyLinksCore service not initialized');
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      
      const tx = await service.withdrawAffiliateEarnings();
      toast.success('Withdrawal submitted...');
      
      await tx.wait();
      toast.success('Affiliate earnings withdrawn successfully!');
      
      return true;
    } catch (error: any) {
      return handleError(error, 'Withdraw affiliate earnings');
    } finally {
      setLoading(false);
    }
  }, [service, handleError]);

  // Utility functions
  const getSpinCredits = useCallback(async (user: string): Promise<string> => {
    if (!service) return '0';

    try {
      return await service.getSpinCredits(user);
    } catch (error: any) {
      handleError(error, 'Get spin credits');
      return '0';
    }
  }, [service, handleError]);

  const getLoyaltyPoints = useCallback(async (user: string): Promise<string> => {
    if (!service) return '0';

    try {
      return await service.getLoyaltyPoints(user);
    } catch (error: any) {
      handleError(error, 'Get loyalty points');
      return '0';
    }
  }, [service, handleError]);

  const getMerchantEarnings = useCallback(async (merchant: string): Promise<string> => {
    if (!service) return '0';

    try {
      return await service.getMerchantEarnings(merchant);
    } catch (error: any) {
      handleError(error, 'Get merchant earnings');
      return '0';
    }
  }, [service, handleError]);

  const getAffiliateEarnings = useCallback(async (affiliate: string): Promise<string> => {
    if (!service) return '0';

    try {
      return await service.getAffiliateEarnings(affiliate);
    } catch (error: any) {
      handleError(error, 'Get affiliate earnings');
      return '0';
    }
  }, [service, handleError]);

  // Bulk payment functions
  const bulkPaySingleMerchant = useCallback(async (request: BulkPaymentToSingleRequest): Promise<{ batchId: number; paymentIds: number[] } | null> => {
    if (!service) {
      toast.error('PyLinksCore service not initialized');
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await service.bulkPaySingleMerchant(request);
      toast.success('Bulk payment to single merchant completed!');
      
      return result;
    } catch (error: any) {
      handleError(error, 'Bulk pay single merchant');
      return null;
    } finally {
      setLoading(false);
    }
  }, [service, handleError]);

  const bulkPayMultipleMerchants = useCallback(async (requests: BulkPaymentRequest[]): Promise<{ batchId: number; paymentIds: number[] } | null> => {
    if (!service) {
      toast.error('PyLinksCore service not initialized');
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await service.bulkPayMultipleMerchants(requests);
      toast.success('Bulk payment to multiple merchants completed!');
      
      return result;
    } catch (error: any) {
      handleError(error, 'Bulk pay multiple merchants');
      return null;
    } finally {
      setLoading(false);
    }
  }, [service, handleError]);

  const bulkCreateEscrowPayments = useCallback(async (request: BulkEscrowPaymentRequest): Promise<{ batchId: number; paymentIds: number[] } | null> => {
    if (!service) {
      toast.error('PyLinksCore service not initialized');
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await service.bulkCreateEscrowPayments(request);
      toast.success('Bulk escrow payments created!');
      
      return result;
    } catch (error: any) {
      handleError(error, 'Bulk create escrow payments');
      return null;
    } finally {
      setLoading(false);
    }
  }, [service, handleError]);

  const processBulkEscrowBatch = useCallback(async (batchId: number): Promise<boolean> => {
    if (!service) {
      toast.error('PyLinksCore service not initialized');
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      
      const tx = await service.processBulkEscrowBatch(batchId);
      toast.success('Processing bulk escrow batch...');
      
      await tx.wait();
      toast.success('Bulk escrow batch processed successfully!');
      
      return true;
    } catch (error: any) {
      return handleError(error, 'Process bulk escrow batch');
    } finally {
      setLoading(false);
    }
  }, [service, handleError]);

  const getBulkBatch = useCallback(async (batchId: number): Promise<BulkBatchDetails | null> => {
    if (!service) return null;

    try {
      return await service.getBulkBatch(batchId);
    } catch (error: any) {
      handleError(error, 'Get bulk batch');
      return null;
    }
  }, [service, handleError]);

  const getBulkBatchPayments = useCallback(async (batchId: number): Promise<number[]> => {
    if (!service) return [];

    try {
      return await service.getBulkBatchPayments(batchId);
    } catch (error: any) {
      handleError(error, 'Get bulk batch payments');
      return [];
    }
  }, [service, handleError]);

  const getCustomerBulkBatches = useCallback(async (customer: string): Promise<number[]> => {
    if (!service) return [];

    try {
      return await service.getCustomerBulkBatches(customer);
    } catch (error: any) {
      handleError(error, 'Get customer bulk batches');
      return [];
    }
  }, [service, handleError]);

  const getCustomerPayments = useCallback(async (customer: string): Promise<number[]> => {
    if (!service) return [];

    try {
      return await service.getCustomerPayments(customer);
    } catch (error: any) {
      handleError(error, 'Get customer payments');
      return [];
    }
  }, [service, handleError]);

  const refresh = useCallback(() => {
    setError(null);
    // Force re-initialization
    if (ready && user?.wallet?.address && window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const pyLinksService = new PyLinksCoreService(signer);
      setService(pyLinksService);
    }
  }, [ready, user]);

  return {
    service,
    loading,
    error,
    
    // Payment functions
    createPayment,
    processPayment,
    getPayment,
    
    // Bulk payment functions
    bulkPaySingleMerchant,
    bulkPayMultipleMerchants,
    bulkCreateEscrowPayments,
    processBulkEscrowBatch,
    getBulkBatch,
    getBulkBatchPayments,
    getCustomerBulkBatches,
    
    // Subscription functions
    createSubscription,
    processSubscriptionPayment,
    getSubscription,
    
    // Affiliate functions
    registerAffiliate,
    getAffiliate,
    withdrawAffiliateEarnings,
    
    // Utility functions
    getSpinCredits,
    getLoyaltyPoints,
    getMerchantEarnings,
    getAffiliateEarnings,
    getCustomerPayments,
    
    // Refresh
    refresh,
  };
}
