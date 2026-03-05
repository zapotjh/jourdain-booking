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
            unit_amount: price,
          },
          quantity: 1,
        },
      ],

      metadata: {
        checkIn,
        checkOut,
        email,
      },

      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Stripe error" }, { status: 500 });
  }
}