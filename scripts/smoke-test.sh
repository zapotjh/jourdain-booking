#!/usr/bin/env bash
# Smoke test: request-booking → host/approve (자동) → 수동: Stripe 결제 → webhook → DB 확인
# 사용: ./scripts/smoke-test.sh   또는  BASE_URL=https://your-preview.vercel.app ./scripts/smoke-test.sh

set -e
BASE_URL="${BASE_URL:-http://localhost:3000}"
GUEST_EMAIL="${GUEST_EMAIL:-tojhlim@gmail.com}"
GUEST_PHONE="${GUEST_PHONE:-01098248666}"
GUEST_NAME="${GUEST_NAME:-Smoke Test}"

# check_in / check_out: 2박, total 200 EUR (고정 날짜로 크로스플랫폼 호환)
CHECK_IN="${CHECK_IN:-2026-04-15}"
CHECK_OUT="${CHECK_OUT:-2026-04-17}"
TOTAL_EUR=200

echo "=== Smoke test (BASE_URL=$BASE_URL, guest=$GUEST_EMAIL) ==="
echo ""

# 1) POST /api/request-booking
echo "[1/2] POST /api/request-booking ..."
RESP=$(curl -s -X POST "${BASE_URL}/api/request-booking" \
  -H "Content-Type: application/json" \
  -d "{
    \"guest_name\": \"${GUEST_NAME}\",
    \"email\": \"${GUEST_EMAIL}\",
    \"phone\": \"${GUEST_PHONE}\",
    \"check_in\": \"${CHECK_IN}\",
    \"check_out\": \"${CHECK_OUT}\",
    \"total_price_eur\": ${TOTAL_EUR}
  }")

if ! echo "$RESP" | grep -q '"ok":true' || ! echo "$RESP" | grep -q 'approval_token'; then
  echo "request-booking 실패. 응답:"
  echo "$RESP"
  exit 1
fi

BOOKING_ID=$(echo "$RESP" | node -e "let d; try { d=JSON.parse(require('fs').readFileSync(0,'utf8')); } catch(e){} console.log(d?.booking?.id||'');")
APPROVAL_TOKEN=$(echo "$RESP" | node -e "let d; try { d=JSON.parse(require('fs').readFileSync(0,'utf8')); } catch(e){} console.log(d?.booking?.approval_token||'');")
if [ -z "$APPROVAL_TOKEN" ]; then
  echo "approval_token 추출 실패. 응답: $RESP"
  exit 1
fi
echo "  booking_id=$BOOKING_ID"
echo ""

# 2) POST /api/host/approve
echo "[2/2] POST /api/host/approve ..."
APPROVE_RESP=$(curl -s -X POST "${BASE_URL}/api/host/approve" \
  -H "Content-Type: application/json" \
  -d "{\"approval_token\": \"${APPROVAL_TOKEN}\"}")

if ! echo "$APPROVE_RESP" | grep -q '"ok":true' || ! echo "$APPROVE_RESP" | grep -q 'checkout_url'; then
  echo "host/approve 실패. 응답:"
  echo "$APPROVE_RESP"
  exit 1
fi

CHECKOUT_URL=$(echo "$APPROVE_RESP" | node -e "let d; try { d=JSON.parse(require('fs').readFileSync(0,'utf8')); } catch(e){} console.log(d?.checkout_url||'');")
echo "  checkout_url (아래 링크로 결제 진행)"
echo ""
echo "  $CHECKOUT_URL"
echo ""
echo "=== 자동 단계 완료 ==="
echo ""
echo "수동 진행:"
echo "  1) 위 결제 링크를 브라우저에서 열고 Stripe 테스트 카드(4242 4242 4242 4242)로 결제"
echo "  2) 로컬이면 stripe listen 실행 중인지 확인 → webhook 수신 후 booking status=confirmed 확인"
echo "  3) Supabase: bookings id=$BOOKING_ID 행 status, payment_status / email_log 해당 booking_id 확인"
echo ""
