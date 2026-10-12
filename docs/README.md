# WardSeal Documentation

Welcome to the technical documentation for the **WardSeal Identity Platform**.

## Architecture
*   [System Architecture Diagram](architecture/diagram.md) - High-level overview of services and interactions.

## Core Microservices
WardSeal is built as a microservices architecture. Below are the detailed documentation for each core service:

| Service | Description | Links |
|---|---|---|
| **Auth Service** | Authentication, SSO, MFA, and User Portal API. | [Docs](services/authsvc.md) |
| **Directory Service** | Identity store for Users and Groups. | [Docs](services/dirsvc.md) |
| **Governance Service** | Access Reviews, Campaigns, and Requests. | [Docs](services/govsvc.md) |
| **Policy Service** | PBAC/RBAC policy evaluation engine. | [Docs](services/policysvc.md) |
| **Provisioning Service** | SCIM and downstream application provisioning. | [Docs](services/provsvc.md) |

## Guides
*   [Getting Started](../GETTING_STARTED.md)
*   [Quickstart Guide](../QUICKSTART.md)
*   [Developer Tasks](../TASKS.md)
*   [Environment Variables](environment-variables.md)
*   [Deployment Guide](deployment.md)

## API Reference
*   OpenAPI: [`api/openapi.yaml`](../api/openapi.yaml) (management + security-critical routes)
*   Route authz registry: `pkg/routeauthz`
*   Threat model: [THREAT_MODEL.md](THREAT_MODEL.md)
*   Enterprise audit: [ENTERPRISE_AUDIT_REPORT.md](ENTERPRISE_AUDIT_REPORT.md)
*   Runbooks: [BREAK_GLASS.md](runbooks/BREAK_GLASS.md), [PEN_TEST.md](runbooks/PEN_TEST.md), [CLOUD_PREREQS.md](runbooks/CLOUD_PREREQS.md), [URL_HOSTS.md](runbooks/URL_HOSTS.md), [IR_DRILL.md](runbooks/IR_DRILL.md)

## Policies & Compliance
*   [Policy Pack](policies/README.md)
*   [Privacy Policy](policies/privacy-policy.md)
*   [Terms of Service](policies/terms-of-service.md)
*   [Data Processing Addendum (DPA)](policies/data-processing-addendum-dpa.md)
*   [EU/EEA Addendum](policies/addenda/eu-eea-privacy-and-dpa-addendum.md)
*   [India DPDP Addendum](policies/addenda/india-dpdp-addendum.md)
*   [US State Privacy Addendum](policies/addenda/us-state-privacy-addendum.md)
