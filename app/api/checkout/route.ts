// app/api/checkout/route.ts
import { NextResponse } from "next/server";

// (Optional) force Node runtime (not Edge)
export const runtime = "nodejs";

function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export async function POST() {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
  }

  // Build a form-encoded body for Stripe's REST API
  const body = new URLSearchParams();
  body.append("mode", "payment");
  body.append("payment_method_types[0]", "card");
  body.append("success_url", `${siteUrl()}/premium?success=1&session_id={CHECKOUT_SESSION_ID}`);
  body.append("cancel_url", `${siteUrl()}/plan?canceled=1`);
  body.append("line_items[0][price_data][currency]", "gbp");
  body.append("line_items[0][price_data][product_data][name]", "Wedding Planner – PDF & CSV Export");
  body.append("line_items[0][price_data][unit_amount]", String(1000)); // £10.00
  body.append("line_items[0][quantity]", "1");

  try {
    const resp = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const data = await resp.json();

    if (!resp.ok) {
      // Pass Stripe error back for easier debugging
      return NextResponse.json(
        { error: data.error?.message || "Stripe API error" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: data.url });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Network error" }, { status: 500 });
  }
}
