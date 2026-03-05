import Stripe from "stripe";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const stripeSecret = process.env.STRIPE_SECRET_KEY;

    if (!stripeSecret) {
      return NextResponse.json(
        { error: "Missing STRIPE_SECRET_KEY" },
        { status: 500 }
      );
    }

    const stripe = new Stripe(stripeSecret, {
      apiVersion: "2026-02-25.clover",
    });

    const body = await req.json();
    const { checkIn, checkOut, email, price } = body;

    // ✅ price는 반드시 "센트 단위 정수"여야 함 (예: 10유로 = 1000)
    const unitAmount = Number(price);
    if (!Number.isFinite(unitAmount) || unitAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid price. Must be a positive number in cents." },
        { status: 400 }
      );
    }

    // ✅ 사이트 URL 없을 때 기본값 (프로덕션 도메인 넣어두면 편함)
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://jourdain-booking.vercel.app";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: email,

      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Paris Apartment Reservation",
            },
            unit_amount: Math.round(unitAmount),
          },
          quantity: 1,
        },
      ],

      metadata: {
        checkIn,
        checkOut,
        email,
      },

      success_url: `${siteUrl}/success`,
      cancel_url: `${siteUrl}/cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Stripe error" },
      { status: 500 }
    );
  }
}