// app/api/host/approve/route.ts
// Delegates to shared approveBooking(). Do not duplicate approval logic.
// GET with ?approval_token=XXX → 승인 실행 후 /approve/success 로 리다이렉트 (관리자 이메일 "승인하기" 클릭용).
import { NextResponse } from "next/server";
import { approveBooking } from "@/lib/approve-booking";

const DEFAULT_SITE_URL = "https://lappartementjourdain.com";

function getApproveSuccessBase(req: Request) {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, "");
  if (site) return site;
  try {
    return new URL(req.url).origin;
  } catch {
    return "";
  }
}

function successRedirect(req: Request, checkoutUrl: string, bookingId: string) {
  const base = getApproveSuccessBase(req);
  const params = new URLSearchParams({ checkout_url: checkoutUrl, booking_id: bookingId });
  return NextResponse.redirect(`${base}/approve/success?${params.toString()}`, 302);
}

function errorRedirect(req: Request, message: string) {
  const base = getApproveSuccessBase(req);
  const params = new URLSearchParams({ error: message });
  return NextResponse.redirect(`${base}/approve/success?${params.toString()}`, 302);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const approval_token = searchParams.get("approval_token");
    if (!approval_token) return errorRedirect(req, "approval_token이 없습니다.");
    const result = await approveBooking(approval_token);
    if (result.ok) return successRedirect(req, result.checkoutUrl, result.bookingId);
    return errorRedirect(req, result.error || "승인 실패");
  } catch (e: any) {
    console.error("[host-approve] GET unexpected error", e);
    return errorRedirect(req, e?.message || "Unknown error");
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const approval_token = body.approval_token;

    const result = await approveBooking(approval_token);

    if (result.ok) {
      return NextResponse.json(
        { ok: true, booking_id: result.bookingId, checkout_url: result.checkoutUrl },
        { status: 200 },
      );
    }

    return NextResponse.json({ error: result.error }, { status: result.status });
  } catch (e: any) {
    console.error("[host-approve] unexpected error", e);
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
