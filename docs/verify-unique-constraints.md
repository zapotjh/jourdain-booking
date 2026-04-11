# Supabase Unique 제약 확인 방법

Supabase SQL Editor에서 아래 쿼리를 실행하면 **현재 DB에 있는 Unique 제약**을 볼 수 있습니다.

## 1) 전체 테이블의 Unique 제약 보기

```sql
-- public 스키마 테이블들의 UNIQUE 제약 목록
SELECT
  tc.table_schema,
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'UNIQUE'
ORDER BY tc.table_name, tc.constraint_name;
```

## 2) 특정 테이블만 (stripe_webhook_events, email_log)

```sql
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'UNIQUE'
  AND tc.table_name IN ('stripe_webhook_events', 'email_log')
GROUP BY tc.table_name, tc.constraint_name, tc.constraint_type;
```

- **stripe_webhook_events**: `stripe_webhook_events_stripe_event_id_key` (컬럼: `stripe_event_id`) 가 있으면 웹훅 중복 방지가 살아 있는 것입니다.
- **email_log**: UNIQUE **제약**이 아니라 **UNIQUE INDEX** (`email_log_unique_event`) 이므로 아래로 확인합니다.

## 3) Unique INDEX까지 포함 (email_log 등)

```sql
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    indexdef LIKE '%UNIQUE%'
    OR tablename IN ('stripe_webhook_events', 'email_log')
  )
ORDER BY tablename;
```

`email_log_unique_event` 가 보이면 해당 Unique 인덱스가 적용된 상태입니다.

---

## stripe_webhook_events 테이블이 없을 때

테이블은 마이그레이션 `supabase/migrations/09_stripe_webhook_events.sql` 로 생성됩니다.

- **Supabase CLI 사용 시:** `supabase db push` 또는 `supabase migration up` 으로 09번 마이그레이션 적용.
- **수동 적용:** Supabase 대시보드 → SQL Editor에서 `09_stripe_webhook_events.sql` 파일 내용을 복사해 실행하면 테이블과 `stripe_webhook_events_stripe_event_id_key` UNIQUE 제약이 함께 생성됩니다.

적용 후 위 2번 쿼리로 `stripe_webhook_events` / `stripe_event_id` 제약이 보이면 정상입니다.
