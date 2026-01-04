# Getting Started with Identity Platform

Welcome to the Identity Platform! This guide will help you get up and running with the platform locally and start integrating using our Go SDK.

## Prerequisites
- Go 1.25+
- Docker & Docker Compose
- Node.js 18+ (for Admin UI)

## Running Locally

1. **Start Infrastructure**:
   ```bash
   docker-compose up -d postgres redis
   ```

2. **Run Services**:
   (In separate terminals)
   ```bash
   # Auth Service
   go run ./cmd/authsvc
   
   # Directory Service
   go run ./cmd/dirsvc --port 8081
   
   # Governance Service
   go run ./cmd/govsvc --port 8082
   ```

3. **Run Admin UI**:
   ```bash
   cd web/admin
   npm install
   npm run dev
   ```
   Access the UI at http://localhost:5173.

## Using the Go SDK

We provide a Go client to interact with the platform easily.

### Installation
```bash
go get github.com/dhawalhost/wardseal/pkg/client
```

### Example Usage

```go
package main

import (
    "context"
    "fmt"
    "log"

    "github.com/dhawalhost/wardseal/pkg/client"
)

func main() {
    // Initialize Client
    c := client.New(client.Config{
        BaseURL:  "http://localhost:8080",
        TenantID: "your-tenant-id",
    })

    // Authenticate
    ctx := context.Background()
    err := c.Login(ctx, "admin@wardseal.com", "password")
    if err != nil {
        log.Fatalf("Login failed: %v", err)
    }
    fmt.Println("Successfully logged in!")

    // List Users (SCIM)
    users, err := c.ListUsers(ctx, "")
    if err != nil {
        log.Fatalf("Failed to list users: %v", err)
    }

    for _, u := range users {
        fmt.Printf("User: %s (ID: %s)\n", u.UserName, u.ID)
    }
}
```

## API Documentation

- **OpenAPI Spec**: Located at `api/openapi.yaml`.
- **Developer Portal**: Access the "Developer" section in the Admin UI for API references and tools.
