import Razorpay from "razorpay";
import crypto from "crypto";

// Razorpay client (lazy initialized)
let razorpayClient: InstanceType<typeof Razorpay> | null = null;

const getRazorpay = () => {
  if (!razorpayClient) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      throw new Error("Razorpay credentials not configured");
    }
    razorpayClient = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return razorpayClient;
};

interface CreatePaymentLinkParams {
  amount: number; // in rupees (will be converted to paise)
  description: string;
  referenceId: string;
  notes: Record<string, string>;
  customer?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  callbackUrl?: string;
}

/**
 * Create a Razorpay payment link (generic — works for orders and refills)
 */
export const createPaymentLink = async (
  params: CreatePaymentLinkParams
): Promise<{
  success: boolean;
  paymentLinkId?: string;
  shortUrl?: string;
  error?: string;
}> => {
  try {
    const rz = getRazorpay();

    const expireBy = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days

    const link = await rz.paymentLink.create({
      amount: Math.round(params.amount * 100), // Convert to paise
      currency: "INR",
      accept_partial: false,
      description: params.description,
      reference_id: params.referenceId,
      expire_by: expireBy,
      customer: params.customer
        ? {
            name: params.customer.name,
            email: params.customer.email,
            contact: params.customer.contact,
          }
        : undefined,
      notify: {
        sms: false,
        email: false,
      },
      notes: params.notes,
      callback_url: params.callbackUrl,
      callback_method: params.callbackUrl ? "get" : undefined,
    } as any);

    return {
      success: true,
      paymentLinkId: link.id,
      shortUrl: link.short_url,
    };
  } catch (error: any) {
    console.error("Razorpay payment link error:", error);
    return {
      success: false,
      error: error.message ?? "Failed to create payment link",
    };
  }
};

// Alias for backward compatibility with cron refill route
export const createRefillPaymentLink = async (params: {
  amount: number;
  description: string;
  refillAlertId: string;
  userId: string;
  medicineName: string;
  customer?: { name?: string; email?: string; contact?: string };
  callbackUrl?: string;
}) => {
  return createPaymentLink({
    amount: params.amount,
    description: params.description,
    referenceId: `refill_${params.refillAlertId}`,
    notes: {
      refillAlertId: params.refillAlertId,
      userId: params.userId,
      medicineName: params.medicineName,
      source: "pharmacare_autorefill",
    },
    customer: params.customer,
    callbackUrl: params.callbackUrl,
  });
};

/**
 * Fetch payment link status from Razorpay
 */
export const fetchPaymentLinkStatus = async (
  paymentLinkId: string
): Promise<{
  success: boolean;
  status?: string; // "created" | "partially_paid" | "expired" | "cancelled" | "paid"
  amountPaid?: number; // in rupees
  payments?: Array<{ id: string; amount: number; status: string }>;
  error?: string;
}> => {
  try {
    const rz = getRazorpay();
    const link = await rz.paymentLink.fetch(paymentLinkId);

    return {
      success: true,
      status: link.status,
      amountPaid: (link as any).amount_paid ? (link as any).amount_paid / 100 : 0,
      payments: ((link as any).payments ?? []).map((p: any) => ({
        id: p.payment_id,
        amount: p.amount / 100,
        status: p.status,
      })),
    };
  } catch (error: any) {
    console.error("Razorpay fetch error:", error);
    return {
      success: false,
      error: error.message ?? "Failed to fetch payment status",
    };
  }
};

/**
 * Verify Razorpay webhook signature
 */
export const verifyWebhookSignature = (
  body: string,
  signature: string
): boolean => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("RAZORPAY_WEBHOOK_SECRET not configured");
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
};

