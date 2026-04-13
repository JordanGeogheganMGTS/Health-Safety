-- ── Senior Leadership role ────────────────────────────────────────────────────
INSERT INTO roles (name) VALUES ('Senior Leadership') ON CONFLICT (name) DO NOTHING;

-- ── Contracts table ───────────────────────────────────────────────────────────
CREATE TABLE contracts (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(255)  NOT NULL,
  supplier            VARCHAR(255),
  owner_id            UUID          REFERENCES users(id) ON DELETE SET NULL,
  signed_date         DATE,
  renewal_date        DATE,
  contract_value      DECIMAL(12,2),
  notice_period_days  INTEGER       NOT NULL DEFAULT 90,
  notes               TEXT,
  file_path           TEXT,
  file_name           TEXT,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_by          UUID          REFERENCES users(id) ON DELETE SET NULL,
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_by          UUID          REFERENCES users(id) ON DELETE SET NULL
);

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read (app layer controls which roles see the page)
CREATE POLICY "contracts_select"
  ON contracts FOR SELECT TO authenticated
  USING (true);

-- Only System Admin and H&S Manager can write
CREATE POLICY "contracts_insert"
  ON contracts FOR INSERT TO authenticated
  WITH CHECK (auth_role() IN ('System Admin', 'H&S Manager'));

CREATE POLICY "contracts_update"
  ON contracts FOR UPDATE TO authenticated
  USING  (auth_role() IN ('System Admin', 'H&S Manager'))
  WITH CHECK (auth_role() IN ('System Admin', 'H&S Manager'));

CREATE POLICY "contracts_delete"
  ON contracts FOR DELETE TO authenticated
  USING (auth_role() IN ('System Admin', 'H&S Manager'));
