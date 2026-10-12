#!/usr/bin/env bash
set -euo pipefail

CHART_DIR="${CHART_DIR:-deploy/charts/wardseal}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

pass() { echo "✔ $1"; }
fail() { echo "✖ $1"; exit 1; }

render() {
  local name="$1"
  shift
  helm template wardseal "$CHART_DIR" "$@" > "$TMP_DIR/$name.yaml"
}

check_contains() {
  local file="$1"
  local pattern="$2"
  local msg="$3"
  if grep -q "$pattern" "$file"; then
    pass "$msg"
  else
    fail "$msg"
  fi
}

check_not_contains() {
  local file="$1"
  local pattern="$2"
  local msg="$3"
  if grep -q "$pattern" "$file"; then
    fail "$msg"
  else
    pass "$msg"
  fi
}

echo "Rendering environment manifests..."
echo "Ensuring chart dependencies are present..."
helm dependency build "$CHART_DIR" >/dev/null

render local -f "$CHART_DIR/values.yaml" -f "$CHART_DIR/values-local.yaml"
render staging -f "$CHART_DIR/values.yaml" -f "$CHART_DIR/values-staging.yaml"
render staging-cm -f "$CHART_DIR/values.yaml" -f "$CHART_DIR/values-staging.yaml" -f "$CHART_DIR/values-staging-certmanager.yaml"
render prod -f "$CHART_DIR/values.yaml" -f "$CHART_DIR/values-production.yaml"
render prod-cm -f "$CHART_DIR/values.yaml" -f "$CHART_DIR/values-production.yaml" -f "$CHART_DIR/values-production-certmanager.yaml"

echo "Checking ingress class consistency..."
for file in "$TMP_DIR"/*.yaml; do
  check_contains "$file" 'ingressClassName: traefik' "$(basename "$file"): ingress class is traefik"
done

echo "Checking cert-manager split behavior..."
check_not_contains "$TMP_DIR/staging.yaml" 'cert-manager.io/cluster-issuer' "staging base has no cert-manager issuer"
check_contains "$TMP_DIR/staging-cm.yaml" 'cert-manager.io/cluster-issuer: letsencrypt-staging' "staging cert-manager overlay sets letsencrypt-staging"
check_not_contains "$TMP_DIR/prod.yaml" 'cert-manager.io/cluster-issuer' "production base has no cert-manager issuer"
check_contains "$TMP_DIR/prod-cm.yaml" 'cert-manager.io/cluster-issuer: letsencrypt-prod' "production cert-manager overlay sets letsencrypt-prod"

echo "Checking expected ingress hosts..."
check_contains "$TMP_DIR/local.yaml" 'host: "auth.wardseal.local"' "local auth host"
check_contains "$TMP_DIR/local.yaml" 'host: "api.wardseal.local"' "local api host"
check_contains "$TMP_DIR/local.yaml" 'host: "manage.wardseal.local"' "local manage host"
check_contains "$TMP_DIR/local.yaml" 'host: "id.wardseal.local"' "local id host"
check_contains "$TMP_DIR/local.yaml" 'host: "wardseal.local"' "local landing host"
check_contains "$TMP_DIR/staging.yaml" 'host: "auth-staging.wardseal.com"' "staging auth host"
check_contains "$TMP_DIR/staging.yaml" 'host: "api-staging.wardseal.com"' "staging api host"
check_contains "$TMP_DIR/staging.yaml" 'host: "manage-staging.wardseal.com"' "staging manage host"
check_contains "$TMP_DIR/staging.yaml" 'host: "id-staging.wardseal.com"' "staging id host"
check_contains "$TMP_DIR/staging.yaml" 'host: "staging.wardseal.com"' "staging landing host"
check_contains "$TMP_DIR/prod.yaml" 'host: "auth.wardseal.com"' "production auth host"
check_contains "$TMP_DIR/prod.yaml" 'host: "api.wardseal.com"' "production api host"
check_contains "$TMP_DIR/prod.yaml" 'host: "manage.wardseal.com"' "production manage host"
check_contains "$TMP_DIR/prod.yaml" 'host: "id.wardseal.com"' "production id host"
check_contains "$TMP_DIR/prod.yaml" 'host: "wardseal.com"' "production landing host"

echo "Checking critical URL/env configuration..."
check_contains "$TMP_DIR/local.yaml" 'value: "http://auth.wardseal.local"' "local AUTH_SERVICE_URL"
check_contains "$TMP_DIR/local.yaml" 'value: "http://id.wardseal.local"' "local UI_URL"
check_contains "$TMP_DIR/staging.yaml" 'value: "https://auth-staging.wardseal.com"' "staging AUTH_SERVICE_URL"
check_contains "$TMP_DIR/staging.yaml" 'value: "https://id-staging.wardseal.com"' "staging UI_URL"
check_contains "$TMP_DIR/staging.yaml" 'name: "KMS_PROVIDER"' "staging KMS_PROVIDER present"
check_contains "$TMP_DIR/staging.yaml" 'value: "vault"' "staging KMS provider is vault"
check_contains "$TMP_DIR/staging.yaml" 'name: wardseal-vault-kms-staging' "staging Vault AppRole secret wiring"
check_contains "$TMP_DIR/prod.yaml" 'value: "https://auth.wardseal.com"' "production AUTH_SERVICE_URL"
check_contains "$TMP_DIR/prod.yaml" 'value: "https://id.wardseal.com"' "production UI_URL"
check_contains "$TMP_DIR/prod.yaml" 'name: "KMS_PROVIDER"' "production KMS_PROVIDER present"
check_contains "$TMP_DIR/prod.yaml" 'value: "vault"' "production KMS provider is vault"
check_contains "$TMP_DIR/prod.yaml" 'name: wardseal-vault-kms-production' "production Vault AppRole secret wiring"
check_not_contains "$TMP_DIR/prod.yaml" 'admin.wardseal.com' "production admin host removed"
check_not_contains "$TMP_DIR/staging.yaml" 'admin-staging.wardseal.com' "staging admin host removed"

echo "Checking scaling/runtime env propagation..."
for file in "$TMP_DIR/local.yaml" "$TMP_DIR/staging.yaml" "$TMP_DIR/prod.yaml"; do
  check_contains "$file" 'name: "REDIS_ADDR"' "$(basename "$file"): REDIS_ADDR present"
  check_contains "$file" 'name: "RATE_LIMIT_KEY_PREFIX"' "$(basename "$file"): RATE_LIMIT_KEY_PREFIX present"
  check_contains "$file" 'name: "WEBAUTHN_SESSION_TTL_SECONDS"' "$(basename "$file"): WEBAUTHN_SESSION_TTL_SECONDS present"
done

echo "Checking landing deployment posture..."
check_contains "$TMP_DIR/local.yaml" 'name: wardseal-landingui' "local landing chart rendered"
check_contains "$TMP_DIR/staging.yaml" 'name: wardseal-landingui' "staging landing chart rendered"
check_contains "$TMP_DIR/prod.yaml" 'name: wardseal-landingui' "production landing chart rendered"

echo "Checking identity UI (idui) deployment posture..."
check_contains "$TMP_DIR/local.yaml" 'name: wardseal-idui' "local idui chart rendered"
check_contains "$TMP_DIR/staging.yaml" 'name: wardseal-idui' "staging idui chart rendered"
check_contains "$TMP_DIR/prod.yaml" 'name: wardseal-idui' "production idui chart rendered"
check_not_contains "$TMP_DIR/staging.yaml" 'app-staging.wardseal.com' "staging phantom app host removed from CORS/ingress"
check_not_contains "$TMP_DIR/prod.yaml" 'app.wardseal.com' "production phantom app host removed from CORS/ingress"

echo "Checking cloud-readiness wiring (ENVIRONMENT, SERVICE_AUTH, SSL, Redis DNS)..."
check_contains "$TMP_DIR/staging.yaml" 'name: "ENVIRONMENT"' "staging ENVIRONMENT present"
check_contains "$TMP_DIR/staging.yaml" 'value: "staging"' "staging ENVIRONMENT=staging"
check_contains "$TMP_DIR/prod.yaml" 'name: "ENVIRONMENT"' "production ENVIRONMENT present"
check_contains "$TMP_DIR/prod.yaml" 'value: "production"' "production ENVIRONMENT=production"

check_contains "$TMP_DIR/staging.yaml" 'name: SERVICE_AUTH_TOKEN' "staging SERVICE_AUTH_TOKEN mount"
check_contains "$TMP_DIR/staging.yaml" 'name: wardseal-service-auth-staging' "staging service-auth secret ref"
check_contains "$TMP_DIR/prod.yaml" 'name: SERVICE_AUTH_TOKEN' "production SERVICE_AUTH_TOKEN mount"
check_contains "$TMP_DIR/prod.yaml" 'name: wardseal-service-auth-production' "production service-auth secret ref"

check_contains "$TMP_DIR/staging.yaml" 'name: DB_SSLMODE' "staging DB_SSLMODE present"
check_contains "$TMP_DIR/prod.yaml" 'name: DB_SSLMODE' "production DB_SSLMODE present"
if grep -A1 'name: DB_SSLMODE' "$TMP_DIR/staging.yaml" | grep -q 'value: "disable"'; then
  fail "staging DB_SSLMODE must not be disable"
else
  pass "staging DB_SSLMODE is not disable"
fi
if grep -A1 'name: DB_SSLMODE' "$TMP_DIR/prod.yaml" | grep -q 'value: "disable"'; then
  fail "production DB_SSLMODE must not be disable"
else
  pass "production DB_SSLMODE is not disable"
fi

check_contains "$TMP_DIR/staging.yaml" 'redis-staging.wardseal-staging.svc.cluster.local' "staging Redis DNS uses wardseal-staging namespace"
check_contains "$TMP_DIR/prod.yaml" 'redis-production.wardseal-production.svc.cluster.local' "production Redis DNS uses wardseal-production namespace"
check_not_contains "$TMP_DIR/staging.yaml" 'redis-staging.wardseal.svc.cluster.local' "staging Redis not pointing at wardseal namespace"
check_not_contains "$TMP_DIR/prod.yaml" 'redis-production.wardseal.svc.cluster.local' "production Redis not pointing at wardseal namespace"

check_contains "$TMP_DIR/staging.yaml" 'kind: Job' "staging migrate Job rendered"
check_contains "$TMP_DIR/prod.yaml" 'kind: Job' "production migrate Job rendered"
check_contains "$TMP_DIR/staging.yaml" 'helm.sh/hook": pre-install,pre-upgrade' "staging migrate Job is a helm hook"
check_contains "$TMP_DIR/prod.yaml" 'helm.sh/hook": pre-install,pre-upgrade' "production migrate Job is a helm hook"

check_contains "$TMP_DIR/staging.yaml" 'ghcr-pull-secret' "staging GHCR pull secret referenced"
check_contains "$TMP_DIR/prod.yaml" 'ghcr-pull-secret' "production GHCR pull secret referenced"

echo ""
echo "All environment consistency checks passed."
