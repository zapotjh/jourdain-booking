#!/usr/bin/env bash
# Smoke test: 거절 플로우 → 승인 플로우 (자동). 수동: Stripe 결제만.
# 사용: ./scripts/smoke-test-with-reject.sh   또는  BASE_URL=http://localhost:3000 ./scripts/smoke-test-with-reject.sh

set -e
BASE_URL="${BASE_URL:-http://localhost:3000}"
GUEST_EMAIL="${GUEST_EMAIL:-tojhlim@gmail.com}"
GUEST_PHONE="${GUEST_PHONE:-01098248666}"
GUEST_NAME="${GUEST_NAME:-Smoke Test}"

# 거절 테스트용 날짜 (1)
CHECK_IN_REJECT="2026-04-18"
CHECK_OUT_REJECT="2026-04-20"
# 승인 테스트용 날짜 (2) — 기존 예약과 겹치지 않도록 다른 구간 사용
CHECK_IN_APPROVE="${CHECK_IN:-2026-05-01}"
CHECK_OUT_APPROVE="${CHECK_OUT:-2026-05-03}"
TOTAL_EUR=200

echo "=== Smoke test (거절 + 승인) BASE_URL=$BASE_URL ==="
echo ""

# ----- 1) 거절 플로우 -----
echo "--- [1/4] 거절 테스트: POST /api/request-booking ..."
RESP1=$(curl -s -X POST "${BASE_URL}/api/request-booking" \
  -H "Content-Type: application/json" \
  -d "{
    \"guest_name\": \"${GUEST_NAME} Reject\",
    \"email\": \"${GUEST_EMAIL}\",
    \"phone\": \"${GUEST_PHONE}\",
    \"check_in\": \"${CHECK_IN_REJECT}\",
    \"check_out\": \"${CHECK_OUT_REJECT}\",
    \"total_price_eur\": ${TOTAL_EUR}
  }")

if ! echo "$RESP1" | grep -q '"ok":true' || ! echo "$RESP1" | grep -q 'approval_token'; then
  echo "request-booking (거절용) 실패. 응답:"
  echo "$RESP1"
  exit 1
fi

TOKEN_REJECT=$(echo "$RESP1" | node -e "let d; try { d=JSON.parse(require('fs').readFileSync(0,'utf8')); } catch(e){} console.log(d?.booking?.approval_token||'');")
ID_REJECT=$(echo "$RESP1" | node -e "let d; try { d=JSON.parse(require('fs').readFileSync(0,'utf8')); } catch(e){} console.log(d?.booking?.id||'');")
echo "  booking_id=$ID_REJECT"

echo "[2/4] POST /api/host/reject (테스트 메시지 포함) ..."
REJECT_RESP=$(curl -s -X POST "${BASE_URL}/api/host/reject" \
  -H "Content-Type: application/json" \
  -d "{\"approval_token\": \"${TOKEN_REJECT}\", \"message\": \"해당 기간에 이미 예약이 있어 불가능합니다. 다른 날짜로 문의해 주세요.\"}")

if ! echo "$REJECT_RESP" | grep -q '"ok":true'; then
  echo "host/reject 실패. 응답:"
  echo "$REJECT_RESP"
  exit 1
fi
echo "  거절 완료. booking_id=$(echo "$REJECT_RESP" | node -e "let d; try { d=JSON.parse(require('fs').readFileSync(0,'utf8')); } catch(e){} console.log(d?.booking_id||'');")"
echo ""

# ----- 2) 승인 플로우 -----
echo "--- [3/4] 승인 테스트: POST /api/request-booking ..."
RESP2=$(curl -s -X POST "${BASE_URL}/api/request-booking" \
  -H "Content-Type: application/json" \
  -d "{
    \"guest_name\": \"${GUEST_NAME}\",
    \"email\": \"${GUEST_EMAIL}\",
    \"phone\": \"${GUEST_PHONE}\",
    \"check_in\": \"${CHECK_IN_APPROVE}\",
    \"check_out\": \"${CHECK_OUT_APPROVE}\",
    \"total_price_eur\": ${TOTAL_EUR}
  }")

if ! echo "$RESP2" | grep -q '"ok":true' || ! echo "$RESP2" | grep -q 'approval_token'; then
  echo "request-booking (승인용) 실패. 응답:"
  echo "$RESP2"
  exit 1
fi

TOKEN_APPROVE=$(echo "$RESP2" | node -e "let d; try { d=JSON.parse(require('fs').readFileSync(0,'utf8')); } catch(e){} console.log(d?.booking?.approval_token||'');")
ID_APPROVE=$(echo "$RESP2" | node -e "let d; try { d=JSON.parse(require('fs').readFileSync(0,'utf8')); } catch(e){} console.log(d?.booking?.id||'');")
echo "  booking_id=$ID_APPROVE"

echo "[4/4] POST /api/host/approve ..."
APPROVE_RESP=$(curl -s -X POST "${BASE_URL}/api/host/approve" \
  -H "Content-Type: application/json" \
  -d "{\"approval_token\": \"${TOKEN_APPROVE}\"}")

if ! echo "$APPROVE_RESP" | grep -q '"ok":true' || ! echo "$APPROVE_RESP" | grep -q 'checkout_url'; then
  echo "host/approve 실패. 응답:"
  echo "$APPROVE_RESP"
  exit 1
fi

CHECKOUT_URL=$(echo "$APPROVE_RESP" | node -e "let d; try { d=JSON.parse(require('fs').readFileSync(0,'utf8')); } catch(e){} console.log(d?.checkout_url||'');")
echo "  checkout_url 발급됨"
echo ""
echo "=== 자동 단계 완료 (거절 + 승인) ==="
echo ""
echo "거절된 예약: $ID_REJECT (status=canceled, 게스트에게 거절 이메일 발송됨)"
echo "승인된 예약: $ID_APPROVE"
echo ""
echo "결제 링크 (Stripe 테스트 결제용):"
echo "  $CHECKOUT_URL"
echo ""
echo "수동: 위 링크로 결제 후 webhook / DB 확인."
echo ""
