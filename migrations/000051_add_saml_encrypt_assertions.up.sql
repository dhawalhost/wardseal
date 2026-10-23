ALTER TABLE sso_providers ADD COLUMN IF NOT EXISTS saml_encrypt_assertions BOOLEAN DEFAULT false;
