-- Enforce append-only audit_logs at the database layer.
CREATE OR REPLACE FUNCTION wardseal_prevent_audit_mutation()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs is append-only: UPDATE and DELETE are not permitted';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE PROCEDURE wardseal_prevent_audit_mutation();

COMMENT ON TABLE audit_logs IS 'Append-only security audit trail; mutations blocked by trigger';
