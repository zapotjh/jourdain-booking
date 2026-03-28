// GET with ?approval_token=XXX → 메시지 입력 페이지(/approve/reject)로 리다이렉트.
// POST with { approval_token, message? } → 거절 실행 후 JSON. message는 게스트 이메일에 포함.
import { NextResponse } from "next/server";
import { rejectBooking } from "@/lib/reject-booking";

const DEFAULT_SITE_URL = "https://lappartementjourdain.com";

function getBase(req: Request) {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, "");
  if (site) return site;
  try {
    return new URL(req.url).origin;
  } catch {
    return "";
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const approval_token = searchParams.get("approval_token");
    if (!approval_token) {
      return NextResponse.redirect(
        `${getBase(req)}/approve/success?${new URLSearchParams({ error: "approval_token이 없습니다." }).toString()}`,
        302,
      );
    }
    return NextResponse.redirect(
      `${getBase(req)}/approve/reject?${new URLSearchParams({ approval_token }).toString()}`,
      302,
    );
  } catch (e: unknown) {
    console.error("[host/reject] GET error", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.redirect(
      `${getBase(req)}/approve/success?${new URLSearchParams({ error: msg }).toString()}`,
      302,
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const approval_token = body.approval_token;
    const message = body.message ?? null;
    const result = await rejectBooking(approval_token, { guestMessage: message });
    if (result.ok) {
      return NextResponse.json({ ok: true, booking_id: result.bookingId }, { status: 200 });
    }
    return NextResponse.json({ error: result.error }, { status: result.status });
  } catch (e: unknown) {
    console.error("[host/reject] POST error", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
