# Wardseal Phase 3 Handlers Migration: Governance & Directory

## Goal
Now that the data store layer (Phase 2) migration from `sqlx` to `GORM` is fully complete and verified across all packages, Phase 3 aims to migrate the HTTP routing layer. 
We will transition the `governance` and `directory` domains from using `gin-gonic/gin` to `go-chi/chi/v5` using standard `net/http` handlers and the new `github.com/dhawalhost/gokit/response` and `gokit/middleware` capabilities.

## User Review Required

> [!IMPORTANT]
> The change from `gin.Context` to standard `w http.ResponseWriter, r *http.Request` changes every single endpoint handler signature and how we process requests and responses. Please review the patterns below to confirm they align with the `go-service-template` standard.

> [!WARNING]
> We will completely drop `gin.H` and `c.JSON`/`c.ShouldBindJSON` usage. We will leverage `json.NewDecoder(r.Body).Decode(&req)` for inputs and `response.Ok(w, r, data)` / `response.JSON(w, r, status, map[string]string{"error": err.Error()})` for outputs.

> [!CAUTION]
> The route registration functions `func (h *HTTPHandler) RegisterRoutes(router *gin.Engine)` will be converted to the `Pattern() string` and `Router() http.Handler` interface idiom commonly used with Chi. Our `main.go` entrypoints will bind these returned routers to their base paths.

## Proposed Changes

We will refactor the handlers in two domains: `directory` and `governance`.

### 1. The Directory Domain

#### [MODIFY] `internal/directory/api.go`
- **Dependency Changes**: Drop `github.com/gin-gonic/gin` and import `github.com/go-chi/chi/v5` and `github.com/dhawalhost/gokit/response`.
- **Router Implementation**: 
  Convert `RegisterRoutes(router *gin.Engine)` into `Router() http.Handler` that returns a `chi.NewRouter()`.
- **Route Definitions**: Convert `router.Group()` into `chi.Route()` constructions.
  - Set up Middlewares globally on the `chi.Router` directly: `r.Use(middleware.TenantExtractor(...))`.
- **Handler Transformation**:
  - Signature change: `func (h *HTTPHandler) createUser(c *gin.Context)` → `func (h *HTTPHandler) createUser(w http.ResponseWriter, r *http.Request)`
  - Parameter extraction: `c.Param("id")` → `chi.URLParam(r, "id")`.
  - Body bindings: `c.ShouldBindJSON(&req)` → `json.NewDecoder(r.Body).Decode(&req)`.
  - Query parameters: `c.Query("email")` → `r.URL.Query().Get("email")`.
  - JSON Responses: replace `c.JSON(http.StatusOK, data)` with `response.Ok(w, r, data)`.
  - Error Responses: use `response.JSON(w, r, http.Status..., map[string]string{"error": msg})`.

### 2. The Governance Domain

#### [MODIFY] `internal/governance/api.go`
- Apply the same global transformation path for the `governance` core HTTP Handler routing `oauth/clients`, `governance/requests`, and `governance/ip-policies`.

#### [MODIFY] `internal/governance/campaign_api.go`
- Update `RegisterRoutes(router *gin.RouterGroup)` to `Router() http.Handler` returning a configured Chi router.
- Rewrite handlers taking `*gin.Context` to standard library signatures.

#### [MODIFY] `internal/governance/organization_api.go`
- Convert group creation routes `orgs.POST`, `orgs.GET` to `r.Post`, `r.Get` using Chi.
- Refactor the request structure parsers and `response` wrapper logic.

#### [MODIFY] `internal/governance/webhook_api.go`
- Convert the webhook handlers from `gin.Context` to `http.ResponseWriter, *http.Request` signatures.

## Verification Plan

### Automated Tests
1. Perform `go build ./internal/directory ./internal/governance` iteratively to squash typing mismatch errors entirely.
2. Confirm no `gin` imports remain in these domains.

### Manual Verification
Note: Running the endpoints will be challenging until Phase 4 (rewriting `cmd/dirsvc` and `cmd/govsvc` entrypoints) completes. Once the entrypoints establish the new Chi bases, we can test full E2E HTTP flows.
