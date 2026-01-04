#!/bin/bash
# =============================================================================
# Wardseal Kubernetes Secrets Setup Script
# =============================================================================
# This script creates all required Kubernetes secrets for the Wardseal
# Identity Platform. It generates secure random values and JWT keys.
#
# Usage:
#   ./setup-secrets.sh [OPTIONS]
#
# Options:
#   -n, --namespace     Kubernetes namespace (default: wardseal)
#   -e, --env           Environment: staging or production (default: staging)
#   --dry-run           Print secrets without applying
#   -h, --help          Show this help message
#
# Prerequisites:
#   - kubectl configured with cluster access
#   - openssl for key generation
# =============================================================================

set -euo pipefail

# Default values
NAMESPACE="wardseal"
ENVIRONMENT="staging"
DRY_RUN=false
SECRETS_DIR="$(mktemp -d)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Cleanup on exit
trap "rm -rf ${SECRETS_DIR}" EXIT

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

show_help() {
    cat << EOF
Wardseal Kubernetes Secrets Setup Script

Usage:
  ./setup-secrets.sh [OPTIONS]

Options:
  -n, --namespace     Kubernetes namespace (default: wardseal)
  -e, --env           Environment: staging or production (default: staging)
  --dry-run           Print secrets without applying
  -h, --help          Show this help message

Examples:
  # Create secrets in staging namespace
  ./setup-secrets.sh -n wardseal -e staging

  # Create secrets for production
  ./setup-secrets.sh -n wardseal-prod -e production

  # Dry run to see what will be created
  ./setup-secrets.sh --dry-run
EOF
}

generate_random_string() {
    local length=${1:-32}
    openssl rand -base64 $((length * 3 / 4)) | tr -d '\n' | head -c "$length"
}

generate_jwt_keys() {
    local key_dir="$1"
    
    log_info "Generating RSA key pair for JWT signing..."
    
    # Generate private key
    openssl genpkey -algorithm RSA -out "${key_dir}/jwt_private.pem" -pkeyopt rsa_keygen_bits:2048 2>/dev/null
    
    # Extract public key
    openssl rsa -pubout -in "${key_dir}/jwt_private.pem" -out "${key_dir}/jwt_public.pem" 2>/dev/null
    
    log_success "JWT keys generated successfully"
}

# -----------------------------------------------------------------------------
# Parse Arguments
# -----------------------------------------------------------------------------

while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# -----------------------------------------------------------------------------
# Main Script
# -----------------------------------------------------------------------------

echo ""
echo "=================================================="
echo "  Wardseal Secrets Setup"
echo "=================================================="
echo ""
log_info "Namespace: ${NAMESPACE}"
log_info "Environment: ${ENVIRONMENT}"
log_info "Dry Run: ${DRY_RUN}"
echo ""

# Check prerequisites
if ! command -v kubectl &> /dev/null; then
    log_error "kubectl is not installed or not in PATH"
    exit 1
fi

if ! command -v openssl &> /dev/null; then
    log_error "openssl is not installed or not in PATH"
    exit 1
fi

# Generate values
log_info "Generating secure random values..."

DB_PASSWORD=$(generate_random_string 24)
SERVICE_AUTH_TOKEN=$(generate_random_string 48)
WEBHOOK_SECRET=$(generate_random_string 32)

# Generate JWT keys
generate_jwt_keys "${SECRETS_DIR}"
JWT_PRIVATE_KEY=$(cat "${SECRETS_DIR}/jwt_private.pem")
JWT_PUBLIC_KEY=$(cat "${SECRETS_DIR}/jwt_public.pem")

# Create namespace if it doesn't exist
if [ "$DRY_RUN" = false ]; then
    log_info "Creating namespace ${NAMESPACE} if it doesn't exist..."
    kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -
fi

# -----------------------------------------------------------------------------
# Create Secrets
# -----------------------------------------------------------------------------

create_secret() {
    local name="$1"
    local manifest="$2"
    
    if [ "$DRY_RUN" = true ]; then
        echo ""
        log_info "=== DRY RUN: ${name} ==="
        echo "$manifest"
        echo ""
    else
        log_info "Creating secret: ${name}"
        echo "$manifest" | kubectl apply -f -
        log_success "Created ${name}"
    fi
}

# Database Credentials
DB_SECRET=$(cat <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: wardseal-db-credentials-${ENVIRONMENT}
  namespace: ${NAMESPACE}
  labels:
    app.kubernetes.io/name: wardseal
    app.kubernetes.io/component: database
    environment: ${ENVIRONMENT}
type: Opaque
stringData:
  username: "wardseal_user"
  password: "${DB_PASSWORD}"
  host: "postgres-${ENVIRONMENT}.${NAMESPACE}.svc.cluster.local"
  port: "5432"
  database: "identity_platform_${ENVIRONMENT}"
  connection-string: "postgres://wardseal_user:${DB_PASSWORD}@postgres-${ENVIRONMENT}.${NAMESPACE}.svc.cluster.local:5432/identity_platform_${ENVIRONMENT}?sslmode=require"
EOF
)
create_secret "wardseal-db-credentials-${ENVIRONMENT}" "$DB_SECRET"

# Service Auth Token
SERVICE_AUTH_SECRET=$(cat <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: wardseal-service-auth-${ENVIRONMENT}
  namespace: ${NAMESPACE}
  labels:
    app.kubernetes.io/name: wardseal
    app.kubernetes.io/component: auth
    environment: ${ENVIRONMENT}
type: Opaque
stringData:
  token: "${SERVICE_AUTH_TOKEN}"
  header: "X-Service-Auth"
EOF
)
create_secret "wardseal-service-auth-${ENVIRONMENT}" "$SERVICE_AUTH_SECRET"

# JWT Keys
JWT_SECRET=$(cat <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: wardseal-jwt-keys-${ENVIRONMENT}
  namespace: ${NAMESPACE}
  labels:
    app.kubernetes.io/name: wardseal
    app.kubernetes.io/component: auth
    environment: ${ENVIRONMENT}
type: Opaque
stringData:
  private-key: |
$(echo "${JWT_PRIVATE_KEY}" | sed 's/^/    /')
  public-key: |
$(echo "${JWT_PUBLIC_KEY}" | sed 's/^/    /')
EOF
)
create_secret "wardseal-jwt-keys-${ENVIRONMENT}" "$JWT_SECRET"

# Webhook Secret
WEBHOOK_SECRET_MANIFEST=$(cat <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: wardseal-webhook-secret-${ENVIRONMENT}
  namespace: ${NAMESPACE}
  labels:
    app.kubernetes.io/name: wardseal
    app.kubernetes.io/component: webhook
    environment: ${ENVIRONMENT}
type: Opaque
stringData:
  secret: "${WEBHOOK_SECRET}"
EOF
)
create_secret "wardseal-webhook-secret-${ENVIRONMENT}" "$WEBHOOK_SECRET_MANIFEST"

# Image Pull Secret (for private registry)
# This requires GHCR_TOKEN to be set in environment
if [ -n "${GHCR_TOKEN:-}" ]; then
    log_info "Creating image pull secret for GHCR..."
    
    DOCKER_CONFIG=$(cat <<EOF
{
  "auths": {
    "ghcr.io": {
      "auth": "$(echo -n "${GHCR_USERNAME:-}:${GHCR_TOKEN}" | base64)"
    }
  }
}
EOF
)
    
    REGISTRY_SECRET=$(cat <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: ghcr-pull-secret
  namespace: ${NAMESPACE}
  labels:
    app.kubernetes.io/name: wardseal
    app.kubernetes.io/component: registry
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: $(echo -n "$DOCKER_CONFIG" | base64)
EOF
)
    create_secret "ghcr-pull-secret" "$REGISTRY_SECRET"
else
    log_warning "GHCR_TOKEN not set, skipping image pull secret"
    log_warning "Set GHCR_TOKEN and GHCR_USERNAME environment variables to create registry secret"
fi

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------

echo ""
echo "=================================================="
echo "  Setup Complete"
echo "=================================================="
echo ""

if [ "$DRY_RUN" = false ]; then
    log_success "All secrets created successfully!"
    echo ""
    log_info "Created secrets:"
    kubectl get secrets -n "${NAMESPACE}" -l app.kubernetes.io/name=wardseal
    echo ""
    
    log_info "Generated credentials (SAVE THESE SECURELY!):"
    echo ""
    echo "  Database Password:     ${DB_PASSWORD}"
    echo "  Service Auth Token:    ${SERVICE_AUTH_TOKEN}"
    echo "  Webhook Secret:        ${WEBHOOK_SECRET}"
    echo ""
    log_warning "Store these values in a secure password manager!"
else
    log_info "Dry run complete. Use without --dry-run to apply."
fi

echo ""
