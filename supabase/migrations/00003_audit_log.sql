-- ============================================================
-- FILE 3: 00003_audit_log.sql
-- Table: audit_log + trigger function applied to all tables
-- ============================================================

CREATE TABLE audit_log (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        REFERENCES users(id),
  action     VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  table_name VARCHAR(100) NOT NULL,
  record_id  UUID        NOT NULL,
  old_values JSONB,
  new_values JSONB,
  timestamp  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET
);

-- Trigger function
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id  UUID;
  v_record_id UUID;
BEGIN
  -- Extract user from JWT claims
  BEGIN
    v_user_id := (current_setting('request.jwt.claims', true)::jsonb->>'sub')::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  IF TG_OP = 'DELETE' THEN
    v_record_id := OLD.id;
    INSERT INTO audit_log (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (v_user_id, TG_OP, TG_TABLE_NAME, v_record_id, to_jsonb(OLD), NULL);
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    v_record_id := NEW.id;
    INSERT INTO audit_log (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (v_user_id, TG_OP, TG_TABLE_NAME, v_record_id, NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_record_id := NEW.id;
    INSERT INTO audit_log (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (v_user_id, TG_OP, TG_TABLE_NAME, v_record_id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to foundation tables
CREATE TRIGGER audit_sites
  AFTER INSERT OR UPDATE OR DELETE ON sites
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_lookup_values
  AFTER INSERT OR UPDATE OR DELETE ON lookup_values
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_users
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_user_permission_overrides
  AFTER INSERT OR UPDATE OR DELETE ON user_permission_overrides
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
