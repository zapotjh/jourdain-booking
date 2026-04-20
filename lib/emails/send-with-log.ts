/**
 * Event-driven email sending with canonical logging to email_log.
 * Duplicate send is prevented by checking email_log before sending.
 * Pattern: check alreadySent → try send → set status → insert email_log once (always).
 */

import { insertEmailLog, alreadySentEmail } from "@/lib/email-log";
import { sendEmail, sendAdminEmail, ADMIN_EMAIL, resolveRecipientForEnvironment } from "./mailer";
import { sendEmailA } from "./email-a";
import { sendEmailA2 } from "./email-a2";
import { sendEmailB } from "./email-b";
import { sendEmailC } from "./email-c";
import { sendEmailC2 } from "./email-c2";
import { sendEmailBalanceSuccess } from "./email-balance-success";
import { sendEmailBalanceFailedAdmin } from "./email-balance-failed-admin";
import { sendEmailCheckin } from "./email-checkin";
import { sendEmailSecurityDepositRefundedGuest } from "./email-security-deposit-refunded-guest";

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatEurFromCents(cents: number): string {
  const n = Number(cents);
  if (!Number.isFinite(n)) return "0.00";
  return (Math.round(n) / 100).toFixed(2);
}

const ADMIN_TO = ADMIN_EMAIL || "admin@example.com";

/** Guest email: resolve recipient and metadata for email_log (intended_to_email, actual_to_email, email_mode, redirected). */
function guestRedirectMetadata(intendedTo: string): Record<string, unknown> {
  const res = resolveRecipientForEnvironment(intendedTo, "guest");
  return {
    intended_to_email: res.intendedTo,
    actual_to_email: res.actualTo,
    email_mode: res.mode,
    redirected: res.redirected,
  };
}

/** Admin email: metadata for email_log (intended_to_email, actual_to_email, email_mode, redirected). */
function adminRedirectMetadata(): Record<string, unknown> {
  const res = resolveRecipientForEnvironment(ADMIN_EMAIL, "admin");
  return {
    intended_to_email: res.intendedTo || ADMIN_EMAIL,
    actual_to_email: res.actualTo,
    email_mode: res.mode,
    redirected: res.redirected,
  };
}

function logGuestSend(bookingId: string | null, emailType: string, intendedTo: string) {
  const res = resolveRecipientForEnvironment(intendedTo, "guest");
  if (res.redirected) {
    console.log("[email] guest redirected in test mode", {
      intended_to: res.intendedTo,
      actual_to: res.actualTo,
      email_type: emailType,
      booking_id: bookingId,
    });
  }
}

function logAdminSend(bookingId: string | null, emailType: string) {
  const res = resolveRecipientForEnvironment(ADMIN_EMAIL, "admin");
  console.log("[email] admin send", {
    actual_to: res.actualTo,
    email_type: emailType,
    booking_id: bookingId,
  });
}

export type EmailResult =
  | { status: "sent" }
  | { status: "failed"; error?: string }
  | { status: "deduped" };

type ResendData = { id?: string } | null | undefined;

async function doLog(
  bookingId: string | null,
  recipientType: "admin" | "guest",
  emailType: string,
  toEmail: string,
  subject: string | null,
  status: "sent" | "failed",
  providerMessageId: string | null,
  errorMessage: string | null,
  metadata: Record<string, unknown>,
): Promise<void> {
  try {
    await insertEmailLog({
      booking_id: bookingId,
      recipient_type: recipientType,
      email_type: emailType,
      to_email: toEmail,
      subject,
      status,
      provider_message_id: providerMessageId,
      error_message: errorMessage,
      metadata,
    });
  } catch (e) {
    console.error("[send-with-log] insertEmailLog failed", { emailType, error: e });
  }
}

// ---- 1) Booking pending (guest) ----
export async function sendGuestBookingPendingEmail(
  bookingId: string,
  params: {
    to: string;
    guestName: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    totalPriceEur: string;
  },
): Promise<EmailResult> {
  if (await alreadySentEmail(bookingId, "guest", "booking_pending")) return { status: "deduped" };
  const subject = "[예약 요청 접수] 승인 대기 중 - L'appartement Jourdain, Paris";
  let status: "sent" | "failed" = "failed";
  let providerMessageId: string | null = null;
  let errorMessage: string | null = null;
  try {
    const data = (await sendEmailA(params)) as ResendData;
    status = "sent";
    providerMessageId = data?.id ?? null;
  } catch (err) {
    errorMessage = (err as Error)?.message ?? null;
  }
  const guestMeta = guestRedirectMetadata(params.to);
  await doLog(bookingId, "guest", "booking_pending", params.to, subject, status, providerMessageId, errorMessage, guestMeta);
  if (status === "sent") logGuestSend(bookingId, "booking_pending", params.to);
  return status === "sent" ? { status: "sent" } : { status: "failed", error: errorMessage ?? undefined };
}

// ---- 2) Booking approval request (admin) ----
export async function sendAdminBookingApprovalRequestEmail(
  bookingId: string,
  params: {
    guestName: string;
    guestEmail: string;
    guestPhone?: string | null;
    checkIn: string;
    checkOut: string;
    nights: number;
    totalPriceEur: string;
    depositAmountEur: string;
    approvalToken: string;
    siteUrl: string;
  },
): Promise<EmailResult> {
  if (await alreadySentEmail(bookingId, "admin", "booking_approval_request")) return { status: "deduped" };
  const subject = "[관리자 알림] 새로운 예약 승인 요청 - L'appartement Jourdain, Paris";
  const metadata = { booking_id: bookingId };
  let status: "sent" | "failed" = "failed";
  let providerMessageId: string | null = null;
  let errorMessage: string | null = null;
  try {
    const data = (await sendEmailA2({ ...params, bookingId })) as ResendData;
    status = "sent";
    providerMessageId = data?.id ?? null;
  } catch (err) {
    errorMessage = (err as Error)?.message ?? null;
  }
  const adminMeta = { ...metadata, ...adminRedirectMetadata() };
  await doLog(bookingId, "admin", "booking_approval_request", ADMIN_TO, subject, status, providerMessageId, errorMessage, adminMeta);
  if (status === "sent") logAdminSend(bookingId, "booking_approval_request");
  return status === "sent" ? { status: "sent" } : { status: "failed", error: errorMessage ?? undefined };
}

// ---- 2.5) Booking rejected by host (guest) ----
export async function sendGuestBookingRejectedEmail(
  bookingId: string,
  params: {
    to: string;
    guestName: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    hostMessage?: string | null;
  },
): Promise<EmailResult> {
  const emailType = "booking_rejected";
  if (await alreadySentEmail(bookingId, "guest", emailType)) return { status: "deduped" };
  const subject = "[예약 안내] 요청하신 예약이 승인되지 않았습니다 - L'appartement Jourdain, Paris";
  const gn = escapeHtml(params.guestName);
  const hostMessageBlock =
    params.hostMessage && params.hostMessage.trim()
      ? `<p style="margin:20px 0;padding:16px;background:#f8f9fa;border-left:4px solid #95a5a6;white-space:pre-wrap;">${escapeHtml(params.hostMessage.trim())}</p>`
      : "";
  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;line-height:1.7;">
  <h2 style="color:#2c3e50;">예약 요청 결과 안내</h2>
  <p>안녕하세요, <strong>${gn}</strong>님</p>
  <p>요청하신 <strong>${params.checkIn}</strong> ~ <strong>${params.checkOut}</strong> (${params.nights}박) 예약이 현재 일정으로는 수락되지 않았습니다.</p>
  ${hostMessageBlock}
  <p>다른 날짜로 다시 문의해 주시거나, 문의 사항이 있으시면 이메일로 연락 부탁드립니다.</p>
  <p style="font-size:13px;color:#666;margin:14px 0 0 0;"><strong>문의사항이 있으시면 이 이메일에 그대로 답장을 눌러 이메일을 보내주세요.</strong></p>
  <p style="font-size:13px;color:#666;margin:6px 0 0 0;">For any questions, replying directly to this email is the fastest way to reach us.</p>
  <p style="font-size:13px;color:#666;">L'appartement Jourdain, Paris</p>
</div>`;
  let status: "sent" | "failed" = "failed";
  let providerMessageId: string | null = null;
  let errorMessage: string | null = null;
  try {
    const data = (await sendEmail({ to: params.to, subject, html, recipientType: "guest" })) as ResendData;
    status = "sent";
    providerMessageId = data?.id ?? null;
  } catch (err) {
    errorMessage = (err as Error)?.message ?? null;
  }
  const guestMeta = guestRedirectMetadata(params.to);
  await doLog(bookingId, "guest", emailType, params.to, subject, status, providerMessageId, errorMessage, guestMeta);
  if (status === "sent") logGuestSend(bookingId, emailType, params.to);
  return status === "sent" ? { status: "sent" } : { status: "failed", error: errorMessage ?? undefined };
}

// ---- 3) Approved + payment link (guest) ----
export async function sendGuestApprovedPaymentLinkEmail(
  bookingId: string,
  params: {
    to: string;
    guestName: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    longStay: boolean;
    totalPriceEur: string;
    depositAmountEur: string;
    balanceAmountEur: string;
    checkoutUrl: string;
    expiresAt: string;
  },
): Promise<EmailResult> {
  if (await alreadySentEmail(bookingId, "guest", "booking_approved_payment_link")) return { status: "deduped" };
  const subject = "[예약 승인] 예약금 결제 안내 - L'appartement Jourdain, Paris";
  const metadata = { checkout_url: params.checkoutUrl };
  let status: "sent" | "failed" = "failed";
  let providerMessageId: string | null = null;
  let errorMessage: string | null = null;
  try {
    const data = (await sendEmailB(params)) as ResendData;
    status = "sent";
    providerMessageId = data?.id ?? null;
  } catch (err) {
    errorMessage = (err as Error)?.message ?? null;
  }
  const guestMeta = { ...metadata, ...guestRedirectMetadata(params.to) };
  await doLog(bookingId, "guest", "booking_approved_payment_link", params.to, subject, status, providerMessageId, errorMessage, guestMeta);
  if (status === "sent") logGuestSend(bookingId, "booking_approved_payment_link", params.to);
  return status === "sent" ? { status: "sent" } : { status: "failed", error: errorMessage ?? undefined };
}

// ---- 4) Deposit succeeded (guest) ----
export async function sendGuestDepositPaymentSucceededEmail(
  bookingId: string,
  params: {
    to: string;
    guestName: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    longStay: boolean;
    totalPriceEur: string;
    depositAmountEur: string;
    balanceAmountEur: string;
    stripeSessionId?: string | null;
  },
): Promise<EmailResult> {
  if (await alreadySentEmail(bookingId, "guest", "deposit_payment_succeeded")) return { status: "deduped" };
  const subject = "파리 숙소 예약이 확정되었습니다 | Your Paris Stay is Confirmed";
  const metadata = { stripe_session_id: params.stripeSessionId ?? null };
  let status: "sent" | "failed" = "failed";
  let providerMessageId: string | null = null;
  let errorMessage: string | null = null;
  try {
    const data = (await sendEmailC({ ...params, bookingId })) as ResendData;
    status = "sent";
    providerMessageId = data?.id ?? null;
  } catch (err) {
    errorMessage = (err as Error)?.message ?? null;
  }
  const guestMeta = { ...metadata, ...guestRedirectMetadata(params.to) };
  await doLog(bookingId, "guest", "deposit_payment_succeeded", params.to, subject, status, providerMessageId, errorMessage, guestMeta);
  if (status === "sent") logGuestSend(bookingId, "deposit_payment_succeeded", params.to);
  return status === "sent" ? { status: "sent" } : { status: "failed", error: errorMessage ?? undefined };
}

// ---- 5) Deposit succeeded (admin) ----
export async function sendAdminDepositPaymentSucceededEmail(
  bookingId: string,
  params: {
    guestName: string;
    guestEmail: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    longStay: boolean;
    totalPriceEur: string;
    depositAmountEur: string;
    balanceAmountEur: string;
    stripeSessionId?: string | null;
    stripePaymentIntentId?: string | null;
    confirmedAt: string;
  },
): Promise<EmailResult> {
  if (await alreadySentEmail(bookingId, "admin", "deposit_payment_succeeded")) return { status: "deduped" };
  const subject = "[관리자 알림] 결제 완료 및 예약 확정 - L'appartement Jourdain, Paris";
  const metadata = {
    stripe_session_id: params.stripeSessionId ?? null,
    stripe_payment_intent_id: params.stripePaymentIntentId ?? null,
  };
  let status: "sent" | "failed" = "failed";
  let providerMessageId: string | null = null;
  let errorMessage: string | null = null;
  try {
    const data = (await sendEmailC2({ ...params, bookingId })) as ResendData;
    status = "sent";
    providerMessageId = data?.id ?? null;
  } catch (err) {
    errorMessage = (err as Error)?.message ?? null;
  }
  const adminMeta = { ...metadata, ...adminRedirectMetadata() };
  await doLog(bookingId, "admin", "deposit_payment_succeeded", ADMIN_TO, subject, status, providerMessageId, errorMessage, adminMeta);
  if (status === "sent") logAdminSend(bookingId, "deposit_payment_succeeded");
  return status === "sent" ? { status: "sent" } : { status: "failed", error: errorMessage ?? undefined };
}

// ---- 6) Deposit failed (guest) ----
export async function sendGuestDepositPaymentFailedEmail(
  bookingId: string,
  params: {
    to: string;
    guestName: string;
    checkIn: string;
    checkOut: string;
  },
): Promise<EmailResult> {
  if (await alreadySentEmail(bookingId, "guest", "deposit_payment_failed")) return { status: "deduped" };
  const subject = "예약금 결제 만료 또는 실패 | Deposit Payment Expired or Failed";
  const n = escapeHtml(params.guestName);
  const ci = escapeHtml(params.checkIn);
  const co = escapeHtml(params.checkOut);
  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;line-height:1.7;">
  <h2 style="color:#c0392b;">예약금 결제 안내</h2>
  <p>안녕하세요, ${n}님</p>
  <p>예약금 결제가 완료되지 않았거나 만료되었습니다. 체크인 예정일: ${ci}.</p>
  <p>새 결제 링크가 필요하시면 호스트에게 연락해 주세요.</p>
  <p style="font-size:13px;color:#666;margin:14px 0 0 0;"><strong>문의사항이 있으시면 이 이메일에 그대로 답장을 눌러 이메일을 보내주세요.</strong></p>
  <p style="font-size:13px;color:#666;margin:6px 0 0 0;">For any questions, replying directly to this email is the fastest way to reach us.</p>
  <hr/>
  <p>Your deposit payment was not completed or has expired. Check-in: ${co}. Please contact the host for a new payment link if needed.</p>
</div>`;
  let status: "sent" | "failed" = "failed";
  let providerMessageId: string | null = null;
  let errorMessage: string | null = null;
  try {
    const data = (await sendEmail({ to: params.to, subject, html, recipientType: "guest" })) as ResendData;
    status = "sent";
    providerMessageId = data?.id ?? null;
  } catch (err) {
    errorMessage = (err as Error)?.message ?? null;
  }
  const guestMeta = guestRedirectMetadata(params.to);
  await doLog(bookingId, "guest", "deposit_payment_failed", params.to, subject, status, providerMessageId, errorMessage, guestMeta);
  if (status === "sent") logGuestSend(bookingId, "deposit_payment_failed", params.to);
  return status === "sent" ? { status: "sent" } : { status: "failed", error: errorMessage ?? undefined };
}

// ---- 7) Deposit failed (admin) ----
export async function sendAdminDepositPaymentFailedEmail(
  bookingId: string,
  params: {
    guestName: string;
    guestEmail: string;
    checkIn: string;
    checkOut: string;
  },
): Promise<EmailResult> {
  if (await alreadySentEmail(bookingId, "admin", "deposit_payment_failed")) return { status: "deduped" };
  const subject = "[관리자 알림] 예약금 결제 만료/실패 - L'appartement Jourdain, Paris";
  const bid = escapeHtml(bookingId);
  const gn = escapeHtml(params.guestName);
  const ge = escapeHtml(params.guestEmail);
  const ci = escapeHtml(params.checkIn);
  const co = escapeHtml(params.checkOut);
  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;line-height:1.7;">
  <h2 style="color:#c0392b;">예약금 결제 만료 또는 실패</h2>
  <p>예약 ID: ${bid}</p>
  <p>게스트: ${gn} (${ge})</p>
  <p>체크인: ${ci} / 체크아웃: ${co}</p>
  <p>수동으로 결제 링크를 재발송하거나 예약을 취소할 수 있습니다.</p>
</div>`;
  let status: "sent" | "failed" = "failed";
  let providerMessageId: string | null = null;
  let errorMessage: string | null = null;
  try {
    const data = (await sendAdminEmail({ subject, html })) as ResendData;
    status = "sent";
    providerMessageId = data?.id ?? null;
  } catch (err) {
    errorMessage = (err as Error)?.message ?? null;
  }
  const adminMeta = adminRedirectMetadata();
  await doLog(bookingId, "admin", "deposit_payment_failed", ADMIN_TO, subject, status, providerMessageId, errorMessage, adminMeta);
  if (status === "sent") logAdminSend(bookingId, "deposit_payment_failed");
  return status === "sent" ? { status: "sent" } : { status: "failed", error: errorMessage ?? undefined };
}

// ---- 8) Balance succeeded (guest) ----
export async function sendGuestBalancePaymentSucceededEmail(
  bookingId: string,
  params: {
    to: string;
    guestName: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    totalPriceEur: string;
    depositAmountEur: string;
    accommodationBalanceAmountEur: string;
    securityDepositAmountEur?: string;
    totalChargedAmountEur?: string;
  },
): Promise<EmailResult> {
  if (await alreadySentEmail(bookingId, "guest", "balance_payment_succeeded")) return { status: "deduped" };
  const subject = "잔금 결제가 완료되었습니다 | Balance Payment Completed";
  let status: "sent" | "failed" = "failed";
  let providerMessageId: string | null = null;
  let errorMessage: string | null = null;
  try {
    const data = (await sendEmailBalanceSuccess(params)) as ResendData;
    status = "sent";
    providerMessageId = data?.id ?? null;
  } catch (err) {
    errorMessage = (err as Error)?.message ?? null;
  }
  const guestMeta = guestRedirectMetadata(params.to);
  await doLog(bookingId, "guest", "balance_payment_succeeded", params.to, subject, status, providerMessageId, errorMessage, guestMeta);
  if (status === "sent") logGuestSend(bookingId, "balance_payment_succeeded", params.to);
  return status === "sent" ? { status: "sent" } : { status: "failed", error: errorMessage ?? undefined };
}

// ---- 9) Balance succeeded (admin) ----
export async function sendAdminBalancePaymentSucceededEmail(
  bookingId: string,
  params: {
    guestName: string;
    guestEmail: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    totalPriceEur: string;
    depositAmountEur: string;
    accommodationBalanceAmountEur: string;
    securityDepositAmountEur?: string;
    totalChargedAmountEur?: string;
  },
): Promise<EmailResult> {
  if (await alreadySentEmail(bookingId, "admin", "balance_payment_succeeded")) return { status: "deduped" };
  const subject = "[관리자 알림] 잔금 결제 완료 - L'appartement Jourdain, Paris";
  const bid = escapeHtml(bookingId);
  const gn = escapeHtml(params.guestName);
  const ge = escapeHtml(params.guestEmail);
  const ci = escapeHtml(params.checkIn);
  const co = escapeHtml(params.checkOut);
  const hasDeposit = !!(params.securityDepositAmountEur && params.securityDepositAmountEur.length > 0);
  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;line-height:1.7;">
  <h2 style="color:#27ae60;">잔금 결제 완료</h2>
  <p>예약 ID: ${bid}</p>
  <p>게스트: ${gn} (${ge})</p>
  <p>체크인: ${ci} / 체크아웃: ${co} (${params.nights}박)</p>
  <p>총 금액 €${escapeHtml(params.totalPriceEur)} (예약금 €${escapeHtml(params.depositAmountEur)} + 잔금 €${escapeHtml(params.accommodationBalanceAmountEur)}${hasDeposit ? ` + 환불 보증금 €${escapeHtml(params.securityDepositAmountEur ?? "")}` : ""}) 결제 완료.</p>
  ${params.totalChargedAmountEur ? `<p><strong>이번 결제 합계(잔금+보증금):</strong> €${escapeHtml(params.totalChargedAmountEur)}</p>` : ""}
</div>`;
  let status: "sent" | "failed" = "failed";
  let providerMessageId: string | null = null;
  let errorMessage: string | null = null;
  try {
    const data = (await sendAdminEmail({ subject, html })) as ResendData;
    status = "sent";
    providerMessageId = data?.id ?? null;
  } catch (err) {
    errorMessage = (err as Error)?.message ?? null;
  }
  const adminMeta = adminRedirectMetadata();
  await doLog(bookingId, "admin", "balance_payment_succeeded", ADMIN_TO, subject, status, providerMessageId, errorMessage, adminMeta);
  if (status === "sent") logAdminSend(bookingId, "balance_payment_succeeded");
  return status === "sent" ? { status: "sent" } : { status: "failed", error: errorMessage ?? undefined };
}

// ---- X) Security deposit refunded (guest) ----
export async function sendGuestSecurityDepositRefundedEmail(
  bookingId: string,
  params: {
    to: string;
    guestName: string;
    checkIn: string;
    checkOut: string;
    securityDepositAmountEur: string;
  },
): Promise<EmailResult> {
  if (await alreadySentEmail(bookingId, "guest", "security_deposit_refunded_guest")) return { status: "deduped" };
  const subject = "보증금 환불 완료 안내 | Security Deposit Refunded";
  let status: "sent" | "failed" = "failed";
  let providerMessageId: string | null = null;
  let errorMessage: string | null = null;
  try {
    const data = (await sendEmailSecurityDepositRefundedGuest(params)) as ResendData;
    status = "sent";
    providerMessageId = data?.id ?? null;
  } catch (err) {
    errorMessage = (err as Error)?.message ?? null;
  }
  const guestMeta = guestRedirectMetadata(params.to);
  await doLog(
    bookingId,
    "guest",
    "security_deposit_refunded_guest",
    params.to,
    subject,
    status,
    providerMessageId,
    errorMessage,
    guestMeta,
  );
  if (status === "sent") logGuestSend(bookingId, "security_deposit_refunded_guest", params.to);
  return status === "sent" ? { status: "sent" } : { status: "failed", error: errorMessage ?? undefined };
}

// ---- 10) Balance failed (guest) ----
export async function sendGuestBalancePaymentFailedEmail(
  bookingId: string,
  params: {
    to: string;
    guestName: string;
    checkIn: string;
    checkOut: string;
    balanceAmountEur: string;
    attemptNumber: number;
    failureReason?: string | null;
  },
): Promise<EmailResult> {
  if (await alreadySentEmail(bookingId, "guest", "balance_payment_failed", params.attemptNumber)) return { status: "deduped" };
  const subject = "예약 잔여금 자동결제 실패 | Balance Auto-Charge Failed";
  const n = escapeHtml(params.guestName);
  const amt = escapeHtml(params.balanceAmountEur);
  const ci = escapeHtml(params.checkIn);
  const reason = params.failureReason ? escapeHtml(params.failureReason) : "";
  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;line-height:1.7;">
  <h2 style="color:#c0392b;">예약 잔여금 자동결제 실패</h2>
  <p>안녕하세요, ${n}님</p>
  <p>잔금(€${amt}) 자동 결제가 실패했습니다. (시도 ${params.attemptNumber}/3)</p>
  ${reason ? `<p>사유: ${reason}</p>` : ""}
  <p><strong>24시간 내에 자동으로 재시도되며, 3회 시도 모두 실패 시 예약이 자동으로 취소됩니다.</strong></p>
  <p>호스트가 별도로 결제 링크를 보내드리거나, 문의해 주세요.</p>
  <p style="font-size:13px;color:#666;margin:14px 0 0 0;"><strong>문의사항이 있으시면 이 이메일에 그대로 답장을 눌러 이메일을 보내주세요.</strong></p>
  <p style="font-size:13px;color:#666;margin:6px 0 0 0;">For any questions, replying directly to this email is the fastest way to reach us.</p>
  <hr/>
  <p>Balance payment (€${amt}) could not be processed. The host may send a manual payment link. Check-in: ${ci}.</p>
</div>`;
  const metadata = { attempt: params.attemptNumber, attempt_number: params.attemptNumber };
  let status: "sent" | "failed" = "failed";
  let providerMessageId: string | null = null;
  let errorMessage: string | null = null;
  try {
    const data = (await sendEmail({ to: params.to, subject, html, recipientType: "guest" })) as ResendData;
    status = "sent";
    providerMessageId = data?.id ?? null;
  } catch (err) {
    errorMessage = (err as Error)?.message ?? null;
  }
  const guestMeta = { ...metadata, ...guestRedirectMetadata(params.to) };
  await doLog(bookingId, "guest", "balance_payment_failed", params.to, subject, status, providerMessageId, errorMessage, guestMeta);
  if (status === "sent") logGuestSend(bookingId, "balance_payment_failed", params.to);
  return status === "sent" ? { status: "sent" } : { status: "failed", error: errorMessage ?? undefined };
}

// ---- 11) Balance failed (admin) ----
export async function sendAdminBalancePaymentFailedEmail(
  bookingId: string,
  params: {
    guestName: string;
    guestEmail: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    totalPriceEur: string;
    depositAmountEur: string;
    balanceAmountEur: string;
    attemptCount: number;
    failureReason?: string | null;
    stripeBalancePaymentIntentId?: string | null;
    /** When attemptCount === 3: balance payment link to send to guest (optional). */
    balancePaymentLinkUrl?: string | null;
  },
): Promise<EmailResult> {
  if (await alreadySentEmail(bookingId, "admin", "balance_payment_failed", params.attemptCount)) return { status: "deduped" };
  const subject = "[관리자 알림] 예약 잔여금 자동결제 실패 - L'appartement Jourdain, Paris";
  const metadata = {
    attempt: params.attemptCount,
    attempt_number: params.attemptCount,
    stripe_balance_payment_intent_id: params.stripeBalancePaymentIntentId ?? null,
  };
  let status: "sent" | "failed" = "failed";
  let providerMessageId: string | null = null;
  let errorMessage: string | null = null;
  try {
    const data = (await sendEmailBalanceFailedAdmin({ ...params, bookingId })) as ResendData;
    status = "sent";
    providerMessageId = data?.id ?? null;
  } catch (err) {
    errorMessage = (err as Error)?.message ?? null;
  }
  const adminMeta = { ...metadata, ...adminRedirectMetadata() };
  await doLog(bookingId, "admin", "balance_payment_failed", ADMIN_TO, subject, status, providerMessageId, errorMessage, adminMeta);
  if (status === "sent") logAdminSend(bookingId, "balance_payment_failed");
  return status === "sent" ? { status: "sent" } : { status: "failed", error: errorMessage ?? undefined };
}

// ---- 12) Check-in reminder 1d (guest) ----
export async function sendGuestCheckinReminder1dEmail(
  bookingId: string,
  params: {
    to: string;
    guestName: string;
    checkIn: string;
  },
): Promise<EmailResult> {
  if (await alreadySentEmail(bookingId, "guest", "checkin_reminder_1d")) return { status: "deduped" };
  const subject = "체크인 안내 | Self Check-in Information";
  let status: "sent" | "failed" = "failed";
  let providerMessageId: string | null = null;
  let errorMessage: string | null = null;
  try {
    const data = (await sendEmailCheckin(params)) as ResendData;
    status = "sent";
    providerMessageId = data?.id ?? null;
  } catch (err) {
    errorMessage = (err as Error)?.message ?? null;
  }
  const guestMeta = guestRedirectMetadata(params.to);
  await doLog(bookingId, "guest", "checkin_reminder_1d", params.to, subject, status, providerMessageId, errorMessage, guestMeta);
  if (status === "sent") logGuestSend(bookingId, "checkin_reminder_1d", params.to);
  return status === "sent" ? { status: "sent" } : { status: "failed", error: errorMessage ?? undefined };
}

// ---- 13) Check-in reminder 1d (admin, optional) ----
export async function sendAdminCheckinReminder1dEmail(
  bookingId: string,
  params: {
    guestName: string;
    guestEmail: string;
    checkIn: string;
    checkOut: string;
  },
): Promise<EmailResult> {
  if (await alreadySentEmail(bookingId, "admin", "checkin_reminder_1d")) return { status: "deduped" };
  const subject = "[관리자 알림] 체크인 1일 전 - L'appartement Jourdain, Paris";
  const bid = escapeHtml(bookingId);
  const gn = escapeHtml(params.guestName);
  const ge = escapeHtml(params.guestEmail);
  const ci = escapeHtml(params.checkIn);
  const co = escapeHtml(params.checkOut);
  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;line-height:1.7;">
  <h2 style="color:#2c3e50;">체크인 1일 전</h2>
  <p>예약 ID: ${bid}</p>
  <p>게스트: ${gn} (${ge})</p>
  <p>체크인: ${ci} / 체크아웃: ${co}</p>
  <p>셀프 체크인 안내 메일이 게스트에게 발송되었습니다.</p>
</div>`;
  let status: "sent" | "failed" = "failed";
  let providerMessageId: string | null = null;
  let errorMessage: string | null = null;
  try {
    const data = (await sendAdminEmail({ subject, html })) as ResendData;
    status = "sent";
    providerMessageId = data?.id ?? null;
  } catch (err) {
    errorMessage = (err as Error)?.message ?? null;
  }
  const adminMeta = adminRedirectMetadata();
  await doLog(bookingId, "admin", "checkin_reminder_1d", ADMIN_TO, subject, status, providerMessageId, errorMessage, adminMeta);
  if (status === "sent") logAdminSend(bookingId, "checkin_reminder_1d");
  return status === "sent" ? { status: "sent" } : { status: "failed", error: errorMessage ?? undefined };
}

// ---- 14) Check-out reminder 1d (guest) ----
export async function sendGuestCheckoutReminder1dEmail(
  bookingId: string,
  params: {
    to: string;
    guestName: string;
    checkOut: string;
  },
): Promise<EmailResult> {
  const emailType = "checkout_reminder_guest";
  if (await alreadySentEmail(bookingId, "guest", emailType)) return { status: "deduped" };

  const subject = "체크아웃 안내 | L’appartement Jourdain";

  const n = escapeHtml(params.guestName);
  const co = escapeHtml(params.checkOut);

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:640px;margin:0 auto;color:#1a1a1a;line-height:1.75;">
  <h2 style="color:#2c3e50;margin:0 0 12px 0;">체크아웃 안내</h2>
  <p style="margin:0 0 14px 0;">안녕하세요, ${n}님</p>
  <p style="margin:0 0 14px 0;">체크아웃 시간은 <strong>오전 11시</strong>입니다. (체크아웃: ${co})</p>

  <div style="margin:18px 0 0 0;padding:14px 14px;border:1px solid #eee;border-radius:10px;background:#fafafa;">
    <p style="margin:0 0 10px 0;"><strong>퇴실전 필수 체크사항</strong></p>
    <ol style="margin:0 0 10px 18px;padding:0;">
      <li>히터 모두 끄기</li>
      <li>조명 모두 끄기</li>
      <li>창문을 모두 닫아주세요.<br/><span style="color:#555;">*창문을 닫지 않아 벌레가 들어오거나 도난이 발생하면 문제가 됩니다.</span></li>
      <li>쓰레기는 건물 뒤쪽 마당의 쓰레기통에 버려 주세요.<br/><span style="color:#555;">초록색: 일반 쓰레기 / 노랑뚜껑: 재활용 쓰레기</span></li>
    </ol>
    <p style="margin:12px 0 8px 0;"><strong>퇴실 시</strong></p>
    <ol style="margin:0 0 0 18px;padding:0;">
      <li>열쇠를 다시 키박스에 넣어 주세요</li>
      <li>코드: 3851</li>
      <li>네 개의 자물쇠 숫자를 섞어 주세요</li>
    </ol>
  </div>

  <hr style="margin:24px 0;border:none;border-top:1px solid #eee;" />
  <h3 style="color:#2c3e50;white-space:pre-line;">
━━━━━━━━━━━━━━━━━━━
📸 인스타그램
━━━━━━━━━━━━━━━━━━━
  </h3>
  <p style="font-size:14px;color:#555;">
    파리에서의 시간이 즐거우셨다면<br/>
    <strong>@lapt.Jourdain</strong> 태그해서 올려주세요!<br/>
    소중한 기록들을 계정에서 함께 나누고 싶습니다 :)
  </p>

  <p style="margin:18px 0 0 0;">감사합니다 :)<br/>파리에서 즐거운 시간 보내셨길 바랍니다!</p>

  <hr style="margin:22px 0;border:none;border-top:1px solid #eee;"/>

  <h3 style="color:#2c3e50;margin:0 0 10px 0;">Check-out instructions</h3>
  <p style="margin:0 0 14px 0;">Hello ${n},</p>
  <p style="margin:0 0 14px 0;">Check-out time is <strong>11:00 AM</strong>. (Check-out: ${co})</p>

  <div style="margin:18px 0 0 0;padding:14px 14px;border:1px solid #eee;border-radius:10px;background:#fafafa;">
    <p style="margin:0 0 10px 0;"><strong>Required checklist before leaving</strong></p>
    <ol style="margin:0 0 10px 18px;padding:0;">
      <li>Turn off all heaters</li>
      <li>Turn off all lights</li>
      <li>Please close all windows.<br/><span style="color:#555;">*If windows are left open, insects may enter or theft may occur, which can cause issues.</span></li>
      <li>Please dispose of trash in the bins in the backyard behind the building.<br/><span style="color:#555;">Green: general waste / Yellow lid: recycling</span></li>
    </ol>
    <p style="margin:12px 0 8px 0;"><strong>At check-out</strong></p>
    <ol style="margin:0 0 0 18px;padding:0;">
      <li>Please return the key to the key box</li>
      <li>Code: 3851</li>
      <li>Scramble the four dials after locking</li>
    </ol>
  </div>

  <p style="font-size:14px;color:#555;">
    If you enjoyed your time in Paris,<br/>
    tag us at <strong>@lapt.Jourdain</strong>!<br/>
    We'd love to share your moments with our community :)
  </p>

  <p style="margin:18px 0 0 0;">Thank you :)<br/>We hope you had a wonderful time in Paris!</p>

  <p style="margin:18px 0 0 0;font-size:13px;color:#666;">
    <strong>문의사항이 있으시면 이 이메일에 그대로 답장을 눌러 이메일을 보내주세요.</strong>
  </p>
  <p style="margin:6px 0 0 0;font-size:13px;color:#666;">
    For any questions, replying directly to this email is the fastest way to reach us.
  </p>
</div>`;

  let status: "sent" | "failed" = "failed";
  let providerMessageId: string | null = null;
  let errorMessage: string | null = null;
  try {
    const data = (await sendEmail({
      to: params.to,
      subject,
      html,
      recipientType: "guest",
    })) as ResendData;
    status = "sent";
    providerMessageId = data?.id ?? null;
  } catch (err) {
    errorMessage = (err as Error)?.message ?? null;
  }
  const guestMeta = guestRedirectMetadata(params.to);
  await doLog(bookingId, "guest", emailType, params.to, subject, status, providerMessageId, errorMessage, guestMeta);
  if (status === "sent") logGuestSend(bookingId, emailType, params.to);
  return status === "sent" ? { status: "sent" } : { status: "failed", error: errorMessage ?? undefined };
}

// ---- 15) Check-out reminder 1d (admin) ----
export async function sendAdminCheckoutReminder1dEmail(
  bookingId: string,
  params: {
    guestName: string;
    guestEmail: string;
    checkIn: string;
    checkOut: string;
  },
): Promise<EmailResult> {
  const emailType = "checkout_reminder_admin";
  if (await alreadySentEmail(bookingId, "admin", emailType)) return { status: "deduped" };

  const subject = "체크아웃 예정 알림 | 관리자용";

  const bid = escapeHtml(bookingId);
  const gn = escapeHtml(params.guestName);
  const ge = escapeHtml(params.guestEmail);
  const ci = escapeHtml(params.checkIn);
  const co = escapeHtml(params.checkOut);

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:640px;margin:0 auto;color:#1a1a1a;line-height:1.75;">
  <h2 style="color:#2c3e50;margin:0 0 12px 0;">체크아웃 1일 전입니다.</h2>
  <p style="margin:0 0 10px 0;">예약 ID: ${bid}</p>
  <p style="margin:0 0 10px 0;">게스트: ${gn} (${ge})</p>
  <p style="margin:0 0 14px 0;">체크인: ${ci} / 체크아웃: ${co}</p>
  <p style="margin:0 0 18px 0;">향숙 아주머니께 체크아웃 알리미를 보내고 청소 스케줄을 확인하세요.</p>

  <hr style="margin:22px 0;border:none;border-top:1px solid #eee;"/>

  <h3 style="color:#2c3e50;margin:0 0 10px 0;">Check-out reminder | Admin</h3>
  <p style="margin:0 0 10px 0;">Check-out is scheduled for tomorrow.</p>
  <p style="margin:0;">Please notify the cleaning staff and confirm the cleaning schedule.</p>
</div>`;

  let status: "sent" | "failed" = "failed";
  let providerMessageId: string | null = null;
  let errorMessage: string | null = null;
  try {
    const data = (await sendAdminEmail({ subject, html })) as ResendData;
    status = "sent";
    providerMessageId = data?.id ?? null;
  } catch (err) {
    errorMessage = (err as Error)?.message ?? null;
  }
  const adminMeta = adminRedirectMetadata();
  await doLog(bookingId, "admin", emailType, ADMIN_TO, subject, status, providerMessageId, errorMessage, adminMeta);
  if (status === "sent") logAdminSend(bookingId, emailType);
  return status === "sent" ? { status: "sent" } : { status: "failed", error: errorMessage ?? undefined };
}

// ---- 16) Security deposit refund request (admin) ----
export async function sendAdminSecurityDepositRefundRequestEmail(
  bookingId: string,
  params: {
    guestName: string;
    checkIn: string;
    checkOut: string;
    securityDepositAmountCents: number;
    refundLinkUrl: string;
  },
): Promise<EmailResult> {
  const emailType = "security_deposit_refund_request_admin";
  if (await alreadySentEmail(bookingId, "admin", emailType)) return { status: "deduped" };

  const subject = "보증금 환불 확인 요청 | 관리자용";

  const bid = escapeHtml(bookingId);
  const gn = escapeHtml(params.guestName);
  const ci = escapeHtml(params.checkIn);
  const co = escapeHtml(params.checkOut);
  const amt = escapeHtml(formatEurFromCents(params.securityDepositAmountCents));
  const link = escapeHtml(params.refundLinkUrl);

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:680px;margin:0 auto;color:#1a1a1a;line-height:1.75;">
  <h2 style="color:#2c3e50;margin:0 0 12px 0;">보증금 환불 확인 요청</h2>
  <p style="margin:0 0 10px 0;">체크아웃 확인 후 아래 링크에서 <strong>보증금만</strong> 환불하세요.</p>

  <table style="width:100%;border-collapse:collapse;margin:14px 0 18px 0;">
    <tr><td style="padding:6px 0;color:#555;">예약 ID</td><td style="padding:6px 0;font-size:12px;word-break:break-all;">${bid}</td></tr>
    <tr><td style="padding:6px 0;color:#555;">게스트</td><td style="padding:6px 0;">${gn}</td></tr>
    <tr><td style="padding:6px 0;color:#555;">숙박 일정</td><td style="padding:6px 0;">${ci} ~ ${co}</td></tr>
    <tr><td style="padding:6px 0;color:#555;">청구된 보증금</td><td style="padding:6px 0;"><strong>€${amt}</strong></td></tr>
  </table>

  <p style="margin:0 0 8px 0;"><strong>환불 링크</strong></p>
  <p style="margin:0 0 18px 0;"><a href="${link}" style="color:#1a73e8;word-break:break-all;">${link}</a></p>

  <hr style="margin:22px 0;border:none;border-top:1px solid #eee;"/>

  <h3 style="color:#2c3e50;margin:0 0 10px 0;">Refund security deposit | Admin</h3>
  <p style="margin:0 0 10px 0;">After confirming check-out, please refund <strong>only the security deposit</strong> using the link below.</p>
  <p style="margin:0 0 10px 0;">Guest: ${gn}</p>
  <p style="margin:0 0 10px 0;">Stay: ${ci} ~ ${co}</p>
  <p style="margin:0 0 14px 0;">Charged deposit: €${amt}</p>
  <p style="margin:0;"><a href="${link}" style="color:#1a73e8;word-break:break-all;">${link}</a></p>
</div>`;

  let status: "sent" | "failed" = "failed";
  let providerMessageId: string | null = null;
  let errorMessage: string | null = null;
  try {
    const data = (await sendAdminEmail({ subject, html })) as ResendData;
    status = "sent";
    providerMessageId = data?.id ?? null;
  } catch (err) {
    errorMessage = (err as Error)?.message ?? null;
  }
  const adminMeta = {
    security_deposit_amount_cents: Number(params.securityDepositAmountCents),
    refund_link_url: params.refundLinkUrl,
    ...adminRedirectMetadata(),
  };
  await doLog(bookingId, "admin", emailType, ADMIN_TO, subject, status, providerMessageId, errorMessage, adminMeta);
  if (status === "sent") logAdminSend(bookingId, emailType);
  return status === "sent" ? { status: "sent" } : { status: "failed", error: errorMessage ?? undefined };
}

// ---- 17) Security deposit refund reminder (admin) ----
export async function sendAdminSecurityDepositRefundReminderEmail(
  bookingId: string,
  params: {
    guestName: string;
    checkIn: string;
    checkOut: string;
    securityDepositAmountCents: number;
    refundLinkUrl: string;
  },
): Promise<EmailResult> {
  const emailType = "security_deposit_refund_reminder_admin";
  if (await alreadySentEmail(bookingId, "admin", emailType)) return { status: "deduped" };

  const subject = "보증금 환불 미처리 알림 | 관리자용";

  const bid = escapeHtml(bookingId);
  const gn = escapeHtml(params.guestName);
  const ci = escapeHtml(params.checkIn);
  const co = escapeHtml(params.checkOut);
  const amt = escapeHtml(formatEurFromCents(params.securityDepositAmountCents));
  const link = escapeHtml(params.refundLinkUrl);

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:680px;margin:0 auto;color:#1a1a1a;line-height:1.75;">
  <h2 style="color:#c0392b;margin:0 0 12px 0;">보증금 환불 미처리 알림</h2>
  <p style="margin:0 0 12px 0;">아직 보증금 환불이 처리되지 않았습니다. 체크아웃 확인 후 아래 링크에서 <strong>보증금만</strong> 환불하세요.</p>

  <table style="width:100%;border-collapse:collapse;margin:14px 0 18px 0;">
    <tr><td style="padding:6px 0;color:#555;">예약 ID</td><td style="padding:6px 0;font-size:12px;word-break:break-all;">${bid}</td></tr>
    <tr><td style="padding:6px 0;color:#555;">게스트</td><td style="padding:6px 0;">${gn}</td></tr>
    <tr><td style="padding:6px 0;color:#555;">숙박 일정</td><td style="padding:6px 0;">${ci} ~ ${co}</td></tr>
    <tr><td style="padding:6px 0;color:#555;">보증금</td><td style="padding:6px 0;"><strong>€${amt}</strong></td></tr>
  </table>

  <p style="margin:0 0 8px 0;"><strong>환불 링크</strong></p>
  <p style="margin:0 0 18px 0;"><a href="${link}" style="color:#1a73e8;word-break:break-all;">${link}</a></p>

  <hr style="margin:22px 0;border:none;border-top:1px solid #eee;"/>

  <h3 style="color:#2c3e50;margin:0 0 10px 0;">Deposit refund still pending | Admin</h3>
  <p style="margin:0 0 10px 0;">The security deposit refund has not been processed yet. Please refund <strong>only the deposit</strong> using the link below.</p>
  <p style="margin:0 0 10px 0;">Guest: ${gn}</p>
  <p style="margin:0 0 10px 0;">Stay: ${ci} ~ ${co}</p>
  <p style="margin:0 0 14px 0;">Deposit: €${amt}</p>
  <p style="margin:0;"><a href="${link}" style="color:#1a73e8;word-break:break-all;">${link}</a></p>
</div>`;

  let status: "sent" | "failed" = "failed";
  let providerMessageId: string | null = null;
  let errorMessage: string | null = null;
  try {
    const data = (await sendAdminEmail({ subject, html })) as ResendData;
    status = "sent";
    providerMessageId = data?.id ?? null;
  } catch (err) {
    errorMessage = (err as Error)?.message ?? null;
  }
  const adminMeta = {
    security_deposit_amount_cents: Number(params.securityDepositAmountCents),
    refund_link_url: params.refundLinkUrl,
    ...adminRedirectMetadata(),
  };
  await doLog(bookingId, "admin", emailType, ADMIN_TO, subject, status, providerMessageId, errorMessage, adminMeta);
  if (status === "sent") logAdminSend(bookingId, emailType);
  return status === "sent" ? { status: "sent" } : { status: "failed", error: errorMessage ?? undefined };
}

// ---- 14) Webhook reconciliation alert (admin only) ----
// Sent when a paid booking was in canceled state and was recovered to confirmed.
// Only call after the recovery DB update has succeeded; do not claim recovery in email if update failed.
export async function sendAdminWebhookReconciliationAlert(
  bookingId: string,
  params: { sessionId: string; paymentIntentId?: string | null },
): Promise<EmailResult> {
  const emailType = "webhook_reconciliation_alert";
  if (await alreadySentEmail(bookingId, "admin", emailType)) return { status: "deduped" };
  const subject = "[CRITICAL] Webhook reconciliation: paid booking was canceled — recovered";
  const bid = escapeHtml(bookingId);
  const sid = escapeHtml(params.sessionId);
  const html = `
<div style="font-family:sans-serif;max-width:600px;">
  <h2 style="color:#c0392b;">Payment reconciliation</h2>
  <p>Stripe reported a successful deposit payment, but the booking was in <strong>canceled</strong> state (expire cron likely ran first).</p>
  <p><strong>Booking ID:</strong> ${bid}</p>
  <p><strong>Session ID:</strong> ${sid}</p>
  <p><strong>Action:</strong> Booking status was updated to <strong>confirmed</strong> to satisfy invariant (paid bookings must not remain canceled).</p>
  <p>If the guest was already refunded, operator must handle manually (refund path / manual recovery).</p>
</div>`;
  let status: "sent" | "failed" = "failed";
  let providerMessageId: string | null = null;
  let errorMessage: string | null = null;
  try {
    const data = (await sendAdminEmail({ subject, html })) as ResendData;
    status = "sent";
    providerMessageId = data?.id ?? null;
  } catch (err) {
    errorMessage = (err as Error)?.message ?? null;
  }
  const adminMeta = {
    stripe_session_id: params.sessionId,
    stripe_payment_intent_id: params.paymentIntentId ?? null,
    ...adminRedirectMetadata(),
  };
  await doLog(bookingId, "admin", emailType, ADMIN_TO, subject, status, providerMessageId, errorMessage, adminMeta);
  if (status === "sent") logAdminSend(bookingId, emailType);
  return status === "sent" ? { status: "sent" } : { status: "failed", error: errorMessage ?? undefined };
}

// ---- 15) Refund / dispute alert (admin only) ----
export async function sendAdminRefundAlert(
  bookingId: string,
  params: { reason: "refunded" | "dispute" | "canceled"; chargeId?: string | null; paymentIntentId?: string | null },
): Promise<EmailResult> {
  const emailType = "refund_alert";
  if (await alreadySentEmail(bookingId, "admin", emailType)) return { status: "deduped" };
  const subject = "[ALERT] Stripe refund/dispute — booking requires review";
  const bid = escapeHtml(bookingId);
  const reason = escapeHtml(params.reason);
  const html = `
<div style="font-family:sans-serif;max-width:600px;">
  <h2 style="color:#c0392b;">Refund / payment canceled</h2>
  <p>Stripe reported: <strong>${reason}</strong>.</p>
  <p><strong>Booking ID:</strong> ${bid}</p>
  <p>Booking has been marked for operator review. Check-in reminder and balance charge are excluded for this booking.</p>
</div>`;
  let status: "sent" | "failed" = "failed";
  let providerMessageId: string | null = null;
  let errorMessage: string | null = null;
  try {
    const data = (await sendAdminEmail({ subject, html })) as ResendData;
    status = "sent";
    providerMessageId = data?.id ?? null;
  } catch (err) {
    errorMessage = (err as Error)?.message ?? null;
  }
  const adminMeta = {
    reason: params.reason,
    stripe_charge_id: params.chargeId ?? null,
    stripe_payment_intent_id: params.paymentIntentId ?? null,
    ...adminRedirectMetadata(),
  };
  await doLog(bookingId, "admin", emailType, ADMIN_TO, subject, status, providerMessageId, errorMessage, adminMeta);
  if (status === "sent") logAdminSend(bookingId, emailType);
  return status === "sent" ? { status: "sent" } : { status: "failed", error: errorMessage ?? undefined };
}

// ---- 16) Security deposit hold failed (guest) — one per Paris day per booking ----
export async function sendGuestSecurityDepositHoldFailedEmail(
  bookingId: string,
  params: {
    to: string;
    guestName: string;
    checkIn: string;
    checkOut: string;
    holdAmountEur: string;
    failureReason: string;
    /** Europe/Paris calendar date YYYY-MM-DD for email_log dedupe */
    parisDate: string;
  },
): Promise<EmailResult> {
  const emailType = "security_deposit_hold_failed";
  if (
    await alreadySentEmail(bookingId, "guest", emailType, undefined, {
      parisDate: params.parisDate,
    })
  ) {
    return { status: "deduped" };
  }
  const subject =
    "보증금 승인(카드 홀드) 실패 | Security deposit authorization failed";
  const n = escapeHtml(params.guestName);
  const ci = escapeHtml(params.checkIn);
  const co = escapeHtml(params.checkOut);
  const amt = escapeHtml(params.holdAmountEur);
  const reason = escapeHtml(params.failureReason);
  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;line-height:1.7;">
  <h2 style="color:#c0392b;">보증금 카드 승인(홀드) 실패</h2>
  <p>안녕하세요, ${n}님</p>
  <p>체크인 전 보증금(카드 승인 보류) 처리가 실패했습니다. 금액: €${amt}</p>
  <p><strong>사유:</strong> ${reason}</p>
  <p>카드 한도·잔액을 확인하시거나, 호스트에게 문의해 주세요. 다음 파리 기준 날에 자동으로 한 번 더 시도될 수 있습니다.</p>
  <p style="font-size:13px;color:#666;margin:14px 0 0 0;"><strong>문의사항이 있으시면 이 이메일에 그대로 답장을 눌러 이메일을 보내주세요.</strong></p>
  <p style="font-size:13px;color:#666;margin:6px 0 0 0;">For any questions, replying directly to this email is the fastest way to reach us.</p>
  <hr/>
  <p>Security deposit card authorization (hold) failed before check-in. Amount: €${amt}. Reason: ${reason}. Check-in ${ci} / Check-out ${co}.</p>
</div>`;
  const metadata = { paris_date: params.parisDate };
  let status: "sent" | "failed" = "failed";
  let providerMessageId: string | null = null;
  let errorMessage: string | null = null;
  try {
    const data = (await sendEmail({
      to: params.to,
      subject,
      html,
      recipientType: "guest",
    })) as ResendData;
    status = "sent";
    providerMessageId = data?.id ?? null;
  } catch (err) {
    errorMessage = (err as Error)?.message ?? null;
  }
  const guestMeta = { ...metadata, ...guestRedirectMetadata(params.to) };
  await doLog(
    bookingId,
    "guest",
    emailType,
    params.to,
    subject,
    status,
    providerMessageId,
    errorMessage,
    guestMeta,
  );
  if (status === "sent") logGuestSend(bookingId, emailType, params.to);
  return status === "sent" ? { status: "sent" } : { status: "failed", error: errorMessage ?? undefined };
}

// ---- 17) Security deposit hold failed (admin) ----
export async function sendAdminSecurityDepositHoldFailedEmail(
  bookingId: string,
  params: {
    guestName: string;
    guestEmail: string;
    checkIn: string;
    checkOut: string;
    holdAmountEur: string;
    failureReason: string;
    parisDate: string;
  },
): Promise<EmailResult> {
  const emailType = "security_deposit_hold_failed";
  if (
    await alreadySentEmail(bookingId, "admin", emailType, undefined, {
      parisDate: params.parisDate,
    })
  ) {
    return { status: "deduped" };
  }
  const subject =
    "[관리자 알림] 보증금 카드 홀드 실패 - L'appartement Jourdain, Paris";
  const bid = escapeHtml(bookingId);
  const gn = escapeHtml(params.guestName);
  const ge = escapeHtml(params.guestEmail);
  const ci = escapeHtml(params.checkIn);
  const co = escapeHtml(params.checkOut);
  const amt = escapeHtml(params.holdAmountEur);
  const reason = escapeHtml(params.failureReason);
  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;line-height:1.7;">
  <h2 style="color:#c0392b;">보증금 카드 승인(홀드) 실패</h2>
  <p>체크인 전 자동 보증금 홀드가 실패했습니다.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0;">
    <tr><td style="padding:6px 0;color:#555;">예약 ID</td><td style="padding:6px 0;font-size:12px;word-break:break-all;">${bid}</td></tr>
    <tr><td style="padding:6px 0;color:#555;">게스트</td><td style="padding:6px 0;">${gn}</td></tr>
    <tr><td style="padding:6px 0;color:#555;">이메일</td><td style="padding:6px 0;">${ge}</td></tr>
    <tr><td style="padding:6px 0;color:#555;">체크인/아웃</td><td style="padding:6px 0;">${ci} / ${co}</td></tr>
    <tr><td style="padding:6px 0;color:#555;">홀드 금액</td><td style="padding:6px 0;">€${amt}</td></tr>
    <tr><td style="padding:6px 0;color:#555;">사유</td><td style="padding:6px 0;">${reason}</td></tr>
  </table>
</div>`;
  const metadata = { paris_date: params.parisDate };
  let status: "sent" | "failed" = "failed";
  let providerMessageId: string | null = null;
  let errorMessage: string | null = null;
  try {
    const data = (await sendAdminEmail({ subject, html })) as ResendData;
    status = "sent";
    providerMessageId = data?.id ?? null;
  } catch (err) {
    errorMessage = (err as Error)?.message ?? null;
  }
  const adminMeta = { ...metadata, ...adminRedirectMetadata() };
  await doLog(
    bookingId,
    "admin",
    emailType,
    ADMIN_TO,
    subject,
    status,
    providerMessageId,
    errorMessage,
    adminMeta,
  );
  if (status === "sent") logAdminSend(bookingId, emailType);
  return status === "sent" ? { status: "sent" } : { status: "failed", error: errorMessage ?? undefined };
}

// ---- 18) Security deposit hold succeeded (guest) — once per booking ----
export async function sendGuestSecurityDepositHoldSucceededEmail(
  bookingId: string,
  params: {
    to: string;
    guestName: string;
    checkIn: string;
    checkOut: string;
    holdAmountEur: string;
    stripePaymentIntentId: string;
  },
): Promise<EmailResult> {
  const emailType = "security_deposit_hold_succeeded";
  if (await alreadySentEmail(bookingId, "guest", emailType)) return { status: "deduped" };
  const subject =
    "보증금 카드 승인(홀드) 완료 | Security deposit hold placed";
  const n = escapeHtml(params.guestName);
  const ci = escapeHtml(params.checkIn);
  const co = escapeHtml(params.checkOut);
  const amt = escapeHtml(params.holdAmountEur);
  const pi = escapeHtml(params.stripePaymentIntentId);
  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;line-height:1.7;">
  <h2 style="color:#27ae60;">보증금 카드 승인(홀드) 안내</h2>
  <p>안녕하세요, ${n}님</p>
  <p>체크인 전 보증금 €${amt}에 대한 카드 승인(캡처 전 보류)이 등록되었습니다. 체크아웃 후 정상 시 해제됩니다.</p>
  <p style="font-size:12px;color:#666;">참고 PI: ${pi}</p>
  <hr/>
  <p>Security deposit hold (€${amt}) authorized. Check-in ${ci} / ${co}.</p>
  <p style="font-size:13px;color:#666;margin:14px 0 0 0;"><strong>문의사항이 있으시면 이 이메일에 그대로 답장을 눌러 이메일을 보내주세요.</strong></p>
  <p style="font-size:13px;color:#666;margin:6px 0 0 0;">For any questions, replying directly to this email is the fastest way to reach us.</p>
</div>`;
  let status: "sent" | "failed" = "failed";
  let providerMessageId: string | null = null;
  let errorMessage: string | null = null;
  try {
    const data = (await sendEmail({
      to: params.to,
      subject,
      html,
      recipientType: "guest",
    })) as ResendData;
    status = "sent";
    providerMessageId = data?.id ?? null;
  } catch (err) {
    errorMessage = (err as Error)?.message ?? null;
  }
  const guestMeta = guestRedirectMetadata(params.to);
  await doLog(
    bookingId,
    "guest",
    emailType,
    params.to,
    subject,
    status,
    providerMessageId,
    errorMessage,
    guestMeta,
  );
  if (status === "sent") logGuestSend(bookingId, emailType, params.to);
  return status === "sent" ? { status: "sent" } : { status: "failed", error: errorMessage ?? undefined };
}

// ---- 19) Security deposit hold succeeded (admin) ----
export async function sendAdminSecurityDepositHoldSucceededEmail(
  bookingId: string,
  params: {
    guestName: string;
    guestEmail: string;
    checkIn: string;
    checkOut: string;
    holdAmountEur: string;
    stripePaymentIntentId: string;
  },
): Promise<EmailResult> {
  const emailType = "security_deposit_hold_succeeded";
  if (await alreadySentEmail(bookingId, "admin", emailType)) return { status: "deduped" };
  const subject =
    "[관리자] 보증금 카드 홀드 완료 - L'appartement Jourdain, Paris";
  const bid = escapeHtml(bookingId);
  const gn = escapeHtml(params.guestName);
  const ge = escapeHtml(params.guestEmail);
  const ci = escapeHtml(params.checkIn);
  const co = escapeHtml(params.checkOut);
  const amt = escapeHtml(params.holdAmountEur);
  const pi = escapeHtml(params.stripePaymentIntentId);
  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;line-height:1.7;">
  <h2 style="color:#27ae60;">보증금 홀드 완료</h2>
  <p>예약 ID: ${bid}</p>
  <p>게스트: ${gn} (${ge})</p>
  <p>체크인/아웃: ${ci} / ${co}</p>
  <p>홀드 금액: €${amt}</p>
  <p style="font-size:12px;word-break:break-all;">PI: ${pi}</p>
</div>`;
  let status: "sent" | "failed" = "failed";
  let providerMessageId: string | null = null;
  let errorMessage: string | null = null;
  try {
    const data = (await sendAdminEmail({ subject, html })) as ResendData;
    status = "sent";
    providerMessageId = data?.id ?? null;
  } catch (err) {
    errorMessage = (err as Error)?.message ?? null;
  }
  const adminMeta = {
    stripe_security_deposit_payment_intent_id: params.stripePaymentIntentId,
    ...adminRedirectMetadata(),
  };
  await doLog(
    bookingId,
    "admin",
    emailType,
    ADMIN_TO,
    subject,
    status,
    providerMessageId,
    errorMessage,
    adminMeta,
  );
  if (status === "sent") logAdminSend(bookingId, emailType);
  return status === "sent" ? { status: "sent" } : { status: "failed", error: errorMessage ?? undefined };
}
