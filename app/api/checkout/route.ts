import Stripe from "stripe";
import { NextResponse } from "next/server";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
if (!stripeSecret) {
  throw new Error("Missing STRIPE_SECRET_KEY env var");
}
const stripe = new Stripe(stripeSecret, { apiVersion: "2024-06-20" });

// Helper: build site URL for success/cancel
function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export async function POST() {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: { name: "Wedding Planner – PDF & CSV Export" },
            unit_amount: 1000 // £10.00
          },
          quantity: 1
        }
      ],
      success_url: `${siteUrl()}/premium?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl()}/plan?canceled=1`
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json({ error: err.message ?? "Stripe error" }, { status: 500 });
  }
}
