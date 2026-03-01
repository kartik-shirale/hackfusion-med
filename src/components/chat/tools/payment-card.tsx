"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { updateMessageToolOutput } from "@/actions/chat.action";
import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  CreditCardIcon,
  CheckCircleIcon,
  Loader2Icon,
  ReceiptIcon,
  AlertTriangleIcon,
} from "lucide-react";

interface PaymentCardProps {
  data: {
    orderId: string;
    totalAmount: number;
    items?: {
      name: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }[];
    requiresPayment?: boolean;
    message?: string;
    // Persisted state
    paymentCompleted?: boolean;
    paymentId?: string;
  };
  messageId?: string;
  partIndex?: number;
  onPaymentSuccess?: (orderId: string) => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const PaymentCard = ({
  data,
  messageId,
  partIndex,
  onPaymentSuccess,
}: PaymentCardProps) => {
  const queryClient = useQueryClient();
  const [paying, setPaying] = useState(false);
  const [isPaid, setIsPaid] = useState(data.paymentCompleted ?? false);
  const [paymentId, setPaymentId] = useState(data.paymentId ?? "");
  const [error, setError] = useState("");

  const handlePayment = useCallback(async () => {
    setPaying(true);
    setError("");

    try {
      // Create Razorpay order
      const response = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: data.orderId }),
      });

      const orderData = await response.json();

      if (!orderData.success) {
        setError(orderData.error || "Failed to create payment");
        setPaying(false);
        return;
      }

      // Load Razorpay script if not loaded
      if (!window.Razorpay) {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }

      // Open Razorpay checkout
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "PharmaCare",
        description: `Order #${data.orderId.slice(-8)}`,
        order_id: orderData.razorpayOrderId,
        handler: async (response: any) => {
          // Payment successful
          setIsPaid(true);
          setPaymentId(response.razorpay_payment_id);
          setPaying(false);

          // Persist payment state
          if (messageId && partIndex !== undefined) {
            await updateMessageToolOutput(messageId, partIndex, {
              paymentCompleted: true,
              paymentId: response.razorpay_payment_id,
            });
          }

          // Invalidate cart cache so UI updates
          queryClient.invalidateQueries({ queryKey: ["cart"] });

          // Trigger follow-up to generate bill
          onPaymentSuccess?.(data.orderId);
        },
        modal: {
          ondismiss: () => {
            setPaying(false);
          },
        },
        theme: {
          color: "#1A1A2F",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response: any) => {
        setError(
          response.error.description || "Payment failed. Please try again.",
        );
        setPaying(false);
      });
      rzp.open();
    } catch (err) {
      console.error("Payment error:", err);
      setError("Failed to process payment");
      setPaying(false);
    }
  }, [data.orderId, messageId, partIndex]);

  const subtotal = (data.items ?? []).reduce((sum, i) => sum + i.total, 0);
  const tax = subtotal * 0.18;
  const total = data.totalAmount || subtotal + tax;

  return (
    <div
      className={cn(
        "rounded-xl border bg-card w-full max-w-80",
        isPaid && "border-[#1A1A2F]/30 bg-[#1A1A2F]/5 dark:bg-[#1A1A2F]/10",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          {isPaid ? (
            <CheckCircleIcon className="size-4 text-[#1A1A2F]" />
          ) : (
            <CreditCardIcon className="size-4 text-blue-600" />
          )}
          {isPaid ? "Payment Confirmed" : "Payment Required"}
        </div>
        <Badge
          variant={isPaid ? "default" : "secondary"}
          className={cn("text-xs", isPaid && "bg-[#1A1A2F] text-white")}
        >
          {isPaid ? "PAID" : "PENDING"}
        </Badge>
      </div>

      {/* Order items */}
      {data.items && data.items.length > 0 && (
        <div className="px-4 py-3 space-y-1.5">
          {data.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {item.name} × {item.quantity}
              </span>
              <span className="font-medium">₹{item.total.toFixed(2)}</span>
            </div>
          ))}
          <div className="mt-2 border-t pt-2 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>GST (18%)</span>
              <span>₹{tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <span>Total</span>
              <span className="text-[#1A1A2F]">₹{total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Payment action / confirmation */}
      <div className="px-4 pb-4">
        {isPaid ? (
          <div className="flex items-center gap-2 rounded-lg bg-[#1A1A2F]/5 px-3 py-2.5 text-xs font-medium text-[#1A1A2F] dark:bg-[#1A1A2F]/10 dark:text-[#A8A8C0]">
            <ReceiptIcon className="size-4" />
            <div>
              <p>Payment successful</p>
              {paymentId && (
                <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                  ID: {paymentId}
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-2 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-400">
                <AlertTriangleIcon className="size-3.5" />
                {error}
              </div>
            )}
            <Button
              onClick={handlePayment}
              disabled={paying}
              className="w-full rounded-full bg-[#1A1A2F] hover:bg-[#1A1A2F]/90"
            >
              {paying ? (
                <Loader2Icon className="mr-2 size-4 animate-spin" />
              ) : (
                <CreditCardIcon className="mr-2 size-4" />
              )}
              {paying ? "Processing..." : `Pay ₹${total.toFixed(2)}`}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
