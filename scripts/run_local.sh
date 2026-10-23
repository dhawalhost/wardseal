#!/bin/bash

# Kill all child processes on exit
trap 'kill $(jobs -p)' EXIT

echo "Starting Postgres and Redis via Docker Compose (background)..."
docker-compose up -d postgres redis

echo "Waiting for DB..."
sleep 5

echo "Applying Migrations..."
# Run migrations via the patch tool that handles all migration files
go run ./cmd/migrate_patch/main.go

echo "Starting Services..."

# Set standard env vars
export DB_HOST=localhost
export DB_USER=user
export DB_PASSWORD=password
export DB_NAME=identity_platform
export DB_SSLMODE=disable
export SERVICE_AUTH_TOKEN=dev-secret

# DirSvc
echo "Starting Directory Service (port 8081)..."
go run ./cmd/dirsvc/main.go &
PID_DIR=$!
sleep 5 # Wait for dirsvc to be ready

# AuthService
echo "Starting Auth Service (port 8080)..."
export DIRECTORY_SERVICE_URL=http://127.0.0.1:8081
go run ./cmd/authsvc/main.go &
PID_AUTH=$!
sleep 2

# GovSvc
echo "Starting Governance Service (port 8082)..."
export CORS_ALLOWED_ORIGINS="http://localhost:5173"
go run ./cmd/govsvc/main.go &
PID_GOV=$!

# Frontend
echo "Starting Frontend (port 5173)..."
cd web/admin
npm run dev -- --host &
PID_UI=$!
cd ../..

echo "All services started. Press Ctrl+C to stop."
wait
