-- ============================================================
-- FILE 4: 00004_ppe.sql
-- Tables: ppe_items, user_ppe_records
-- ============================================================

-- ppe_items: catalogue of PPE types the organisation issues
CREATE TABLE ppe_items (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(100) NOT NULL,
  description         TEXT,
  has_sizes           BOOLEAN      NOT NULL DEFAULT FALSE,
  size_category_key   VARCHAR(100),              -- references lookup_categories.key for the relevant size list
  replacement_months  SMALLINT,                  -- NULL = disposable / no fixed interval
  is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- user_ppe_records: individual issuance records
CREATE TABLE user_ppe_records (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users(id),
  ppe_item_id     UUID        NOT NULL REFERENCES ppe_items(id),
  site_id         UUID        NOT NULL REFERENCES sites(id),
  issued_date     DATE        NOT NULL,
  size_value_id   UUID        REFERENCES lookup_values(id),   -- NULL when has_sizes = false
  condition       VARCHAR(50) NOT NULL DEFAULT 'Good'
                              CHECK (condition IN ('Good', 'Fair', 'Poor', 'Replaced')),
  notes           TEXT,
  issued_by       UUID        NOT NULL REFERENCES users(id),
  returned_date   DATE,
  returned_to     UUID        REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit triggers
CREATE TRIGGER audit_ppe_items
  AFTER INSERT OR UPDATE OR DELETE ON ppe_items
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_user_ppe_records
  AFTER INSERT OR UPDATE OR DELETE ON user_ppe_records
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
