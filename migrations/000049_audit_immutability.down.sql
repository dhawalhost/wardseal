DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON audit_logs;
DROP FUNCTION IF EXISTS wardseal_prevent_audit_mutation();
