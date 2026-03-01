import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";
import Twilio from "twilio";

// Shared email layout wrapper
const emailWrapper = (title: string, content: string) => `
  <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
    <div style="background: #1A1A2F; padding: 24px 32px;">
      <h2 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 600; letter-spacing: -0.3px;">${title}</h2>
    </div>
    <div style="padding: 28px 32px;">
      ${content}
    </div>
    <div style="border-top: 1px solid #f0f0f0; padding: 16px 32px; background: #fafafa;">
      <p style="margin: 0; color: #9ca3af; font-size: 11px; text-align: center;">
        PharmaCare AI &mdash; Your AI Pharmacy Assistant<br/>
        This is an automated notification. Please do not reply to this email.
      </p>
    </div>
  </div>
`;

const infoRow = (label: string, value: string) =>
  `<tr><td style="padding: 6px 0; color: #6b7280; font-size: 14px; white-space: nowrap;">${label}</td><td style="padding: 6px 0 6px 16px; font-size: 14px; font-weight: 500; color: #1A1A2F;">${value}</td></tr>`;

// Notification templates per type
const TEMPLATES: Record<
  string,
  (payload: Record<string, any>) => { subject: string; html: string; text: string }
> = {
  order_confirmed: (p) => ({
    subject: `Order #${p.orderId ?? ""} Confirmed — PharmaCare`,
    html: emailWrapper("Order Confirmed", `
      <p style="margin: 0 0 20px; font-size: 15px; color: #374151;">Your order has been confirmed and is being prepared at our warehouse.</p>
      <table style="width: 100%; border-collapse: collapse;">
        ${infoRow("Order ID", `#${p.orderId ?? "N/A"}`)}
        ${p.items ? infoRow("Items", p.items) : ""}
        ${p.total ? infoRow("Total", `₹${p.total}`) : ""}
        ${infoRow("Status", '<span style="display: inline-block; background: #1A1A2F; color: #fff; padding: 2px 10px; border-radius: 4px; font-size: 12px;">Confirmed</span>')}
      </table>
      <p style="margin: 20px 0 0; font-size: 13px; color: #6b7280;">You will be notified once your order ships.</p>
    `),
    text: `Order #${p.orderId ?? "N/A"} confirmed.${p.items ? ` Items: ${p.items}.` : ""}${p.total ? ` Total: ₹${p.total}.` : ""} We'll notify you when it ships.`,
  }),

  refill_done: (p) => ({
    subject: `Refill Processed — PharmaCare`,
    html: emailWrapper("Auto-Refill Processed", `
      <p style="margin: 0 0 20px; font-size: 15px; color: #374151;">Your auto-refill has been processed successfully.</p>
      <table style="width: 100%; border-collapse: collapse;">
        ${infoRow("Medicine", p.medicineName ?? "Your medicine")}
        ${p.orderId ? infoRow("Order ID", `#${p.orderId}`) : ""}
        ${infoRow("Status", '<span style="display: inline-block; background: #1A1A2F; color: #fff; padding: 2px 10px; border-radius: 4px; font-size: 12px;">Processing</span>')}
      </table>
      <p style="margin: 20px 0 0; font-size: 13px; color: #6b7280;">Your order has been placed automatically and will ship soon.</p>
    `),
    text: `Auto-refill processed for ${p.medicineName ?? "your medicine"}.${p.orderId ? ` Order #${p.orderId}.` : ""} Your order will ship soon.`,
  }),

  payment_partial: (p) => ({
    subject: `Payment Update — PharmaCare`,
    html: emailWrapper("Partial Payment Received", `
      <p style="margin: 0 0 20px; font-size: 15px; color: #374151;">We received a partial payment for your order.</p>
      <table style="width: 100%; border-collapse: collapse;">
        ${infoRow("Order ID", `#${p.orderId ?? "N/A"}`)}
        ${infoRow("Amount Paid", `₹${p.amountPaid ?? 0}`)}
        ${p.remaining ? infoRow("Remaining", `<span style="color: #dc2626; font-weight: 600;">₹${p.remaining}</span>`) : ""}
      </table>
      <p style="margin: 20px 0 0; font-size: 13px; color: #6b7280;">Please complete the remaining payment to proceed with your order.</p>
    `),
    text: `Partial payment received for Order #${p.orderId ?? "N/A"}. Paid: ₹${p.amountPaid ?? 0}.${p.remaining ? ` Remaining: ₹${p.remaining}.` : ""} Please complete the payment to proceed.`,
  }),

  low_stock: (p) => ({
    subject: `Low Stock Alert — PharmaCare`,
    html: emailWrapper("Low Stock Alert", `
      <p style="margin: 0 0 20px; font-size: 15px; color: #374151;">A medicine you use is running low in stock.</p>
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 14px 18px; margin-bottom: 16px;">
        <p style="margin: 0; font-size: 14px; font-weight: 600; color: #991b1b;">${p.medicineName ?? "A medicine"}</p>
        <p style="margin: 4px 0 0; font-size: 13px; color: #b91c1c;">Stock is running low. Consider ordering soon.</p>
      </div>
      <p style="margin: 0; font-size: 13px; color: #6b7280;">We recommend placing an order soon to avoid any delays in your treatment.</p>
    `),
    text: `Low stock alert: ${p.medicineName ?? "A medicine"} is running low. Order soon to avoid delays.`,
  }),

  refill_reminder: (p) => ({
    subject: `Refill Reminder — PharmaCare`,
    html: emailWrapper("Refill Reminder", `
      <p style="margin: 0 0 20px; font-size: 15px; color: #374151;">It's time to refill your medicine.</p>
      <table style="width: 100%; border-collapse: collapse;">
        ${infoRow("Medicine", p.medicineName ?? "Your medicine")}
        ${p.daysLeft ? infoRow("Supply Remaining", `${p.daysLeft} days`) : ""}
        ${p.amount ? infoRow("Refill Amount", `₹${p.amount}`) : ""}
      </table>
      ${p.paymentLink ? `
        <div style="margin: 24px 0; text-align: center;">
          <a href="${p.paymentLink}" 
             style="display: inline-block; background: #1A1A2F; color: white; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
            Pay &amp; Refill Now
          </a>
        </div>
        <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">This payment link expires in 7 days.</p>
      ` : `<p style="margin: 20px 0 0; font-size: 13px; color: #6b7280;">Open PharmaCare AI to quickly place a refill order.</p>`}
    `),
    text: `Refill reminder: ${p.medicineName ?? "Your medicine"}.${p.daysLeft ? ` ${p.daysLeft} days of supply left.` : ""}${p.amount ? ` Amount: ₹${p.amount}.` : ""}${p.paymentLink ? ` Pay & refill: ${p.paymentLink}` : " Open PharmaCare to reorder."}`,
  }),

  order_dispatched: (p) => ({
    subject: `Order #${p.orderId ?? ""} Shipped — PharmaCare`,
    html: emailWrapper("Order Shipped", `
      <p style="margin: 0 0 20px; font-size: 15px; color: #374151;">Your order has been picked up and is on its way!</p>
      <table style="width: 100%; border-collapse: collapse;">
        ${infoRow("Order ID", `#${p.orderId ?? "N/A"}`)}
        ${p.items ? infoRow("Items", p.items) : ""}
        ${p.total ? infoRow("Total", `₹${p.total}`) : ""}
        ${p.trackingNumber ? infoRow("Tracking", `<strong>${p.trackingNumber}</strong>`) : ""}
        ${infoRow("Status", '<span style="display: inline-block; background: #2563eb; color: #fff; padding: 2px 10px; border-radius: 4px; font-size: 12px;">Shipped</span>')}
      </table>
      <p style="margin: 20px 0 0; font-size: 13px; color: #6b7280;">You will be notified once your order is delivered.</p>
    `),
    text: `Order #${p.orderId ?? "N/A"} shipped.${p.items ? ` Items: ${p.items}.` : ""}${p.trackingNumber ? ` Tracking: ${p.trackingNumber}.` : ""} We'll notify you when it's delivered.`,
  }),

  order_delivered: (p) => ({
    subject: `Order #${p.orderId ?? ""} Delivered — PharmaCare`,
    html: emailWrapper("Order Delivered", `
      <p style="margin: 0 0 20px; font-size: 15px; color: #374151;">Your order has been delivered successfully!</p>
      <table style="width: 100%; border-collapse: collapse;">
        ${infoRow("Order ID", `#${p.orderId ?? "N/A"}`)}
        ${p.items ? infoRow("Items", p.items) : ""}
        ${p.total ? infoRow("Total", `₹${p.total}`) : ""}
        ${infoRow("Status", '<span style="display: inline-block; background: #1A1A2F; color: #fff; padding: 2px 10px; border-radius: 4px; font-size: 12px;">Delivered</span>')}
      </table>
      <p style="margin: 20px 0 0; font-size: 14px; color: #374151;">Thank you for choosing PharmaCare. We hope you stay healthy!</p>
    `),
    text: `Order #${p.orderId ?? "N/A"} delivered.${p.items ? ` Items: ${p.items}.` : ""}${p.total ? ` Total: ₹${p.total}.` : ""} Thank you for choosing PharmaCare!`,
  }),
};

// Get template for a notification type
const getTemplate = (type: string, payload: Record<string, any>) => {
  const templateFn = TEMPLATES[type];
  if (!templateFn) {
    return {
      subject: `PharmaCare Notification`,
      html: `<p>${JSON.stringify(payload)}</p>`,
      text: JSON.stringify(payload),
    };
  }
  return templateFn(payload);
};

/**
 * Send an email via MailerSend
 */
export const sendEmail = async (
  to: { email: string; name?: string },
  type: string,
  payload: Record<string, any>
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    const apiKey = process.env.MAILERSEND_API_KEY;
    if (!apiKey) {
      return { success: false, error: "MAILERSEND_API_KEY not configured" };
    }

    const fromEmail = process.env.MAILERSEND_FROM_EMAIL ?? "noreply@pharmacare.ai";
    const fromName = process.env.MAILERSEND_FROM_NAME ?? "PharmaCare AI";

    const mailerSend = new MailerSend({ apiKey });
    const { subject, html, text } = getTemplate(type, payload);

    const emailParams = new EmailParams()
      .setFrom(new Sender(fromEmail, fromName))
      .setTo([new Recipient(to.email, to.name ?? to.email)])
      .setSubject(subject)
      .setHtml(html)
      .setText(text);

    const response = await mailerSend.email.send(emailParams);
    const messageId = response?.headers?.get?.("x-message-id") ?? undefined;

    return { success: true, messageId };
  } catch (error: any) {
    console.error("MailerSend error:", error);
    return { success: false, error: error.message ?? "Email send failed" };
  }
};

/**
 * Send a WhatsApp message via Twilio using simple freeform body text.
 */
export const sendWhatsApp = async (
  to: string,
  type: string,
  payload: Record<string, any>
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      console.error("[WhatsApp] Missing Twilio credentials:", {
        hasSid: !!accountSid,
        hasToken: !!authToken,
        hasFrom: !!fromNumber,
      });
      return { success: false, error: "Twilio credentials not configured" };
    }

    const formattedTo = to.startsWith("+") ? to : `+${to}`;
    console.log(`[WhatsApp] Sending ${type} notification to ${formattedTo}`);

    const client = Twilio(accountSid, authToken);
    const { text } = getTemplate(type, payload);

    const message = await client.messages.create({
      from: `whatsapp:${fromNumber}`,
      to: `whatsapp:${formattedTo}`,
      body: text,
    });

    console.log(`[WhatsApp] Message sent: ${message.sid}, status: ${message.status}`);
    return { success: true, messageId: message.sid };
  } catch (error: any) {
    console.error("[WhatsApp] Twilio error:", {
      message: error.message,
      code: error.code,
      moreInfo: error.moreInfo,
      status: error.status,
    });
    return { success: false, error: error.message ?? "WhatsApp send failed" };
  }
};

