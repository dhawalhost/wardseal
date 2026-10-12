#!/usr/bin/env bash
# Create/update the ConfigMap consumed by the Helm migrate Job.
# Usage:
#   ./scripts/create_migrations_configmap.sh <namespace> [configmap-name]
# Example:
#   ./scripts/create_migrations_configmap.sh wardseal-staging wardseal-migrations

set -euo pipefail

NAMESPACE="${1:-}"
CM_NAME="${2:-wardseal-migrations}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MIGRATIONS_DIR="${ROOT}/migrations"

if [[ -z "${NAMESPACE}" ]]; then
  echo "Usage: $0 <namespace> [configmap-name]" >&2
  exit 1
fi

if [[ ! -d "${MIGRATIONS_DIR}" ]]; then
  echo "Migrations directory not found: ${MIGRATIONS_DIR}" >&2
  exit 1
fi

if ! command -v kubectl >/dev/null 2>&1; then
  echo "kubectl is required" >&2
  exit 1
fi

kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -

kubectl create configmap "${CM_NAME}" \
  --namespace "${NAMESPACE}" \
  --from-file="${MIGRATIONS_DIR}" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "ConfigMap ${CM_NAME} applied in namespace ${NAMESPACE}"
