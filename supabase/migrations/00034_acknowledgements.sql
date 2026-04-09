-- ============================================================
-- FILE 34: 00034_acknowledgements.sql
-- Document acknowledgement assignments
-- ============================================================

CREATE TABLE document_acknowledgements (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_type       VARCHAR(30)  NOT NULL
                               CHECK (item_type IN ('document', 'risk_assessment', 'method_statement', 'coshh')),
  item_id         UUID         NOT NULL,
  item_title      VARCHAR(255) NOT NULL,
  assigned_by     UUID         NOT NULL REFERENCES users(id),
  assigned_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  notes           TEXT,
  acknowledged_at TIMESTAMPTZ,
  reset_by        UUID         REFERENCES users(id),
  reset_at        TIMESTAMPTZ,
  reset_reason    TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, item_type, item_id)
);

CREATE INDEX idx_doc_ack_user ON document_acknowledgements(user_id);
CREATE INDEX idx_doc_ack_item ON document_acknowledgements(item_type, item_id);
