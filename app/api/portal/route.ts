import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    // Who is asking? This comes from the login token, never from the request body,
    // so nobody can open the billing portal of an email address that isn't theirs.
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const { data: userData, error: authError } = await getSupabaseAdmin().auth.getUser(token);
    const userEmail = userData?.user?.email;
    if (authError || !userEmail) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });

    if (customers.data.length === 0) {
      return NextResponse.json({ error: "No customer found" }, { status: 404 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: "https://scanify.world/profile",
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Portal error:", error?.message);
    return NextResponse.json({ error: "Portal failed" }, { status: 500 });
  }
}