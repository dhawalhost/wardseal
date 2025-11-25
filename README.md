# Identity & Governance Platform

This repository contains the source code for the Identity & Governance Platform, a multi-tenant, enterprise-grade identity solution.

## Project Structure

The project is organized as a monorepo containing multiple microservices. This structure is designed to promote code sharing, maintainability, and independent service deployment.

-   **/api**: Contains OpenAPI specifications for all public-facing APIs.
-   **/cmd**: Houses the main application entry points. Each subdirectory corresponds to a specific service (e.g., `authsvc`, `dirsvc`).
-   **/configs**: Stores configuration files for different environments (e.g., `development.yaml`, `production.yaml`).
-   **/deploy**: Contains deployment configurations, such as Kubernetes manifests and Helm charts.
-   **/docs**: Includes project documentation, architecture diagrams, and design documents.
-   **/internal**: Contains the core business logic for each service. This code is not intended to be imported by other applications.
    -   **/internal/auth**: Business logic for the Authentication Service.
    -   **/internal/directory**: Business logic for the Directory Service.
    -   **/internal/governance**: Business logic for the Governance Service.
    -   **/internal/policy**: Business logic for the Policy Service.
    -   **/internal/provisioning**: Business logic for the Provisioning Service.
-   **/pkg**: Provides shared libraries and utilities that can be used across multiple services.
    -   **/pkg/config**: Configuration loading and management.
    -   **/pkg/database**: Database connections and abstractions.
    -   **/pkg/errors**: Standardized error handling.
    -   **/pkg/logger**: Structured logging setup.
    -   **/pkg/middleware**: Shared HTTP/gRPC middleware.
    -   **/pkg/observability**: Metrics, tracing, and health checks.
    -   **/pkg/transport**: Shared transport utilities (e.g., HTTP/gRPC helpers).
-   **/scripts**: Includes helper scripts for development, building, and testing.
-   **/test**: Contains end-to-end and integration tests.

## Getting Started

... (To be added)

## Contributing

... (To be added)
