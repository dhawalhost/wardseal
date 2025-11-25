# Go parameters
GOCMD=go
GOBUILD=$(GOCMD) build
GOCLEAN=$(GOCMD) clean
GOTEST=$(GOCMD) test
GOGET=$(GOCMD) get
BINARY_NAME=identity-platform

# Migration parameters
MIGRATE_VERSION = v4.15.2
MIGRATE_OS = $(shell go env GOOS)
MIGRATE_ARCH = $(shell go env GOARCH)
MIGRATE_PATH = ./scripts/migrate
MIGRATE_CMD = $(MIGRATE_PATH)/migrate -path migrations -database 'postgres://user:password@localhost:5432/identity_platform?sslmode=disable'

.PHONY: all test clean deps build docker-up docker-down install-migrate migrate-create migrate-up migrate-down build-authsvc-image push-authsvc-image build-dirsvc-image push-dirsvc-image

all: build

# Build the application
build:
	$(GOBUILD) -o $(BINARY_NAME) ./cmd/...

# Run tests
test:
	$(GOTEST) -v ./...

# Clean build artifacts
clean:
	$(GOCLEAN)
	rm -f $(BINARY_NAME)

# Get dependencies
deps:
	$(GOGET) ./...

# Docker commands
docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

## Migration commands
# Install migrate tool
install-migrate:
	@mkdir -p $(MIGRATE_PATH)
	@echo "Downloading migrate..."
	@curl -L https://github.com/golang-migrate/migrate/releases/download/$(MIGRATE_VERSION)/migrate.$(MIGRATE_OS)-$(MIGRATE_ARCH).tar.gz | tar xvz -C $(MIGRATE_PATH)
	@mv $(MIGRATE_PATH)/migrate.$(MIGRATE_OS)-$(MIGRATE_ARCH) $(MIGRATE_PATH)/migrate
	@chmod +x $(MIGRATE_PATH)/migrate

# Create a new migration file
migrate-create:
	@read -p "Enter migration name: " name; \
	$(MIGRATE_CMD) create -ext sql -dir migrations -seq $$name

# Apply all up migrations
migrate-up:
	$(MIGRATE_CMD) up

# Roll back all down migrations
migrate-down:
	$(MIGRATE_CMD) down

## Docker Image commands
BUILD_IMAGE_PREFIX?=your-docker-repo

build-authsvc-image:
	docker build -t $(BUILD_IMAGE_PREFIX)/authsvc:latest -f cmd/authsvc/Dockerfile .

push-authsvc-image:
	docker push $(BUILD_IMAGE_PREFIX)/authsvc:latest

build-dirsvc-image:
	docker build -t $(BUILD_IMAGE_PREFIX)/dirsvc:latest -f cmd/dirsvc/Dockerfile .

push-dirsvc-image:
	docker push $(BUILD_IMAGE_PREFIX)/dirsvc:latest