import Razorpay from "razorpay";
import prisma from "@/lib/prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export const POST = async (req: Request) => {
  try {
    const { userId } = await auth();
    const { orderId } = await req.json();

    if (!orderId || !userId) {
      return NextResponse.json(
        { error: "Missing orderId or unauthorized" },
        { status: 401 }
      );
    }

    // Fetch the order
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { items: { include: { medicine: true } } },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.paymentStatus === "PAID") {
      return NextResponse.json(
        { error: "Order already paid" },
        { status: 400 }
      );
    }

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(order.totalAmount * 100), // Amount in paise
      currency: "INR",
      receipt: order.id,
      notes: {
        orderId: order.id,
        userId,
      },
    });

    // Store Razorpay order ID
    await prisma.order.update({
      where: { id: order.id },
      data: { razorpayOrderId: razorpayOrder.id },
    });

    return NextResponse.json({
      success: true,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      items: order.items.map((i) => ({
        name: i.medicine.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
    });
  } catch (error) {
    console.error("Razorpay create order error:", error);
    return NextResponse.json(
      { error: "Failed to create payment order" },
      { status: 500 }
    );
  }
};
