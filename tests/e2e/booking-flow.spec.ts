import { expect, test, type Page } from '@playwright/test';

function addDaysUtc(date: Date, days: number) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function ymd(date: Date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function clickCalendarDayByDate(page: Page, target: Date) {
  const dayLabel = String(target.getUTCDate());
  await page.waitForSelector('section[aria-label="예약 달력"]');
  await page.evaluate(
    ({ dayLabel }: { dayLabel: string }) => {
      const spans = Array.from(document.querySelectorAll('section[aria-label="예약 달력"] span'));
      const candidates = spans.filter((s) => s.textContent?.trim() === dayLabel);
      // Choose the one that is inside a clickable day cell (cursor pointer) if possible.
      const pick = candidates.find((s) => {
        const cell = s.closest('div');
        if (!cell) return false;
        const c = getComputedStyle(cell as HTMLElement).cursor;
        return c === 'pointer';
      });
      const span = pick ?? candidates[0];
      if (!span) throw new Error(`Day label not found: ${dayLabel}`);
      (span as HTMLElement).click();
    },
    { dayLabel },
  );
}

function checkboxForLabel(page: Page, labelText: string) {
  return page.locator('label', { hasText: labelText }).locator('input[type="checkbox"]');
}

test.describe('Booking flow core QA', () => {
  test('A. /booking interactions and CTA gating', async ({ page }) => {
    const today = new Date();

    await page.goto('/booking');
    await expect(page.getByText('예약하기')).toBeVisible();

    // 2) Before selection CTA inactive
    const bookingCta = page.getByRole('button', { name: 'CHECK OUT' });
    await expect(bookingCta).toHaveAttribute('aria-disabled', 'true');

    // 3/4) confirmed & pending cells not clickable (cursor not-allowed) and clicking does nothing
    const summaryPlaceholder = page.getByText('날짜를 선택해 주세요.');
    await expect(summaryPlaceholder).toBeVisible();

    // Click any not-allowed calendar cell (confirmed/pending/disabled) and verify summary stays unchanged.
    const clicked = await page.evaluate(() => {
      const calendar = document.querySelector('section[aria-label="예약 달력"]');
      if (!calendar) return false;
      const cells = Array.from(calendar.querySelectorAll('div')) as HTMLElement[];
      const target = cells.find((el) => getComputedStyle(el).cursor === 'not-allowed');
      if (!target) return false;
      target.click();
      return true;
    });
    expect(clicked).toBeTruthy();
    await expect(summaryPlaceholder).toBeVisible();

    // 5) <2 nights shows red warning
    // Pick days outside blocked ranges: today+12 (check-in) and today+13 (check-out) => 1 night
    const ci1 = addDaysUtc(today, 12);
    const co1 = addDaysUtc(today, 13);
    await clickCalendarDayByDate(page, ci1);
    await clickCalendarDayByDate(page, co1);

    const warning = page.getByText(/최소\s*2박\s*이상부터\s*예약\s*가능합니다\./);
    await expect(warning).toBeVisible();
    await expect(warning).toHaveCSS('color', 'rgb(228, 21, 62)');
    await expect(warning).toHaveCSS('font-size', '16px');

    // 6) valid 2+ nights enables CTA
    // Reset by clicking a new check-in, then check-out +2 nights.
    const ci2 = addDaysUtc(today, 15);
    const co2 = addDaysUtc(today, 17);
    await clickCalendarDayByDate(page, ci2);
    await clickCalendarDayByDate(page, co2);
    await expect(bookingCta).toHaveAttribute('aria-disabled', 'false');

    // 7) navigate to checkout
    await bookingCta.click();
    await expect(page).toHaveURL(/\/booking\/checkout\?check_in=\d{4}-\d{2}-\d{2}&check_out=\d{4}-\d{2}-\d{2}/);
  });

  test('B/C. /booking/checkout gating, input colors, submit success + invalid access redirect + 409', async ({ page }) => {
    const today = new Date();
    const ci = addDaysUtc(today, 15);
    const co = addDaysUtc(today, 17);
    const checkoutUrl = `/booking/checkout?check_in=${ymd(ci)}&check_out=${ymd(co)}`;

    // 23) invalid query access redirects to /booking
    await page.goto('/booking/checkout');
    await page.waitForTimeout(250);
    await expect(page).toHaveURL(/\/booking$/);

    await page.goto(checkoutUrl);
    await expect(page.getByText('예약기간')).toBeVisible();
    await expect(page.getByText(new RegExp(`${ci.getUTCFullYear()}\\.`))).toBeVisible();

    // 9) pricing summary present
    await expect(page.getByText('숙박 요금')).toBeVisible();
    await expect(page.getByText('청소비')).toBeVisible();
    await expect(page.getByText('총 요금')).toBeVisible();
    await expect(page.getByText('보증금 40%')).toBeVisible();
    await expect(page.getByText('잔금 60%')).toBeVisible();

    // Inputs
    const emailInput = page.getByPlaceholder('you@example.com');
    const phoneInput = page.getByPlaceholder('+82 10-1234-5678');
    const nameInput = page.getByPlaceholder('홍길동');

    // 10) placeholder exists and input empty
    await expect(emailInput).toHaveValue('');
    await expect(emailInput).toHaveAttribute('placeholder', /@/);

    // 11) invalid email => red typed text
    await emailInput.fill('abc');
    await expect(emailInput).toHaveCSS('color', 'rgb(228, 21, 62)');

    // 12) valid email => dark
    await emailInput.fill('test@example.com');
    await expect(emailInput).toHaveCSS('color', 'rgb(13, 8, 34)');

    // 13) phone invalid => red, valid => dark
    await phoneInput.fill('123');
    await expect(phoneInput).toHaveCSS('color', 'rgb(228, 21, 62)');
    await phoneInput.fill('+82 10 1234 5678');
    await expect(phoneInput).toHaveCSS('color', 'rgb(13, 8, 34)');

    // 14) name 1 char invalid, 2+ valid (gating)
    await nameInput.fill('김');

    const emailAgreeRow = page.getByText('입력한 이메일 주소로 예약 관련 안내를 받겠습니다.').locator('..');
    const phoneNameAgreeRow = page.getByText('입력한 전화번호와 이름으로 예약 관련 연락을 받겠습니다.').locator('..');

    // 15) invalid email disables email checkbox (currently email is valid, so first make invalid)
    await emailInput.fill('x');
    await expect(emailAgreeRow).toHaveCSS('opacity', '0.55');
    await expect(emailAgreeRow).toHaveCSS('cursor', 'not-allowed');

    // restore valid email
    await emailInput.fill('test@example.com');
    await expect(emailAgreeRow).toHaveCSS('opacity', '1');

    // 16) invalid name disables phone+name checkbox
    await expect(phoneNameAgreeRow).toHaveCSS('opacity', '0.55');
    await expect(phoneNameAgreeRow).toHaveCSS('cursor', 'not-allowed');

    // Make name valid
    await nameInput.fill('김철');
    await expect(phoneNameAgreeRow).toHaveCSS('opacity', '1');

    // 18) terms link navigates to /terms
    await page.getByRole('button', { name: '약관보기' }).click();
    await expect(page).toHaveURL(/\/terms$/);
    await page.goBack();
    // After navigation, re-fill inputs (page state may reset)
    await emailInput.fill('test@example.com');
    await phoneInput.fill('+82 10 1234 5678');
    await nameInput.fill('김철');

    // 19/20) CTA gating requires all 6 checks + valid inputs
    const submitBtn = page.getByRole('button', { name: /예약 요청 보내기|전송 중\.\.\./ });
    await expect(submitBtn).toBeDisabled();

    // Check 4 policy checks by clicking their labels
    await checkboxForLabel(page, '이용약관을 읽었으며 약관에 동의합니다.').check();
    await checkboxForLabel(page, '결제는 공식 결제사를 통해 안전하게 처리되며 카드 정보는 저장되지 않습니다.').check();
    await checkboxForLabel(page, '체크인 30일 전까지 전액 환불 가능 / 30일 이내 환불 불가 정책이 적용됩니다.').check();
    await checkboxForLabel(page, '보증금은 카드 홀드 방식이며, 문제 없을 시 자동 해제됩니다.').check();

    // Check email/phone+name linked checks (should be enabled now)
    await checkboxForLabel(page, '입력한 이메일 주소로 예약 관련 안내를 받겠습니다.').check();
    await checkboxForLabel(page, '입력한 전화번호와 이름으로 예약 관련 연락을 받겠습니다.').check();

    await expect(submitBtn).toBeEnabled();

    // 21/22) isSubmitting + success navigation (mock API)
    await page.route('**/api/request-booking', async (route) => {
      const req = route.request();
      const body = await req.postDataJSON();
      // basic assertions: payload has guest_name/email/phone/check_in/check_out/total_price_eur
      if (!body.guest_name || !body.email || !body.phone || !body.check_in || !body.check_out) {
        return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'bad payload' }) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    });

    await submitBtn.click();
    await expect(page).toHaveURL(/\/booking-requested$/);

    // 24) 409 duplicate request shows inline error (mock)
    await page.goto(checkoutUrl);
    await emailInput.fill('test@example.com');
    await phoneInput.fill('+82 10 1234 5678');
    await nameInput.fill('김철');
    await checkboxForLabel(page, '이용약관을 읽었으며 약관에 동의합니다.').check();
    await checkboxForLabel(page, '결제는 공식 결제사를 통해 안전하게 처리되며 카드 정보는 저장되지 않습니다.').check();
    await checkboxForLabel(page, '체크인 30일 전까지 전액 환불 가능 / 30일 이내 환불 불가 정책이 적용됩니다.').check();
    await checkboxForLabel(page, '보증금은 카드 홀드 방식이며, 문제 없을 시 자동 해제됩니다.').check();
    await checkboxForLabel(page, '입력한 이메일 주소로 예약 관련 안내를 받겠습니다.').check();
    await checkboxForLabel(page, '입력한 전화번호와 이름으로 예약 관련 연락을 받겠습니다.').check();

    await page.unroute('**/api/request-booking');
    await page.route('**/api/request-booking', async (route) => {
      return route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'duplicate' }) });
    });
    const submitBtn2 = page.getByRole('button', { name: /예약 요청 보내기|전송 중\.\.\./ });
    await submitBtn2.click();
    await expect(
      page.getByText('이미 같은 날짜로 예약 요청이 접수되어 있습니다. 승인 결과를 기다리거나 잠시 후 다시 시도해주세요.'),
    ).toBeVisible();
  });
});

