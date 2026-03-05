import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    // ✅ 이메일 없거나 이상하면 Stripe에 보내지 말고 여기서 막기
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Invalid email" },
        { status: 400 }
      );
    }

    const origin =
      req.headers.get("origin") || "https://jourdain-booking.vercel.app";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: "Reservation deposit" },
            unit_amount: 1000, // ✅ 10.00 EUR (원하면 바꿔)
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/?success=1`,
      cancel_url: `${origin}/?canceled=1`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}