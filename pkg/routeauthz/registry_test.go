package routeauthz

import (
	"testing"
)

func TestRegistryCoversCriticalSurfaces(t *testing.T) {
	t.Parallel()
	required := map[string]bool{
		"dirsvc POST /internal/tenants":             false,
		"dirsvc POST /users":                        false,
		"policysvc POST /policies":                  false,
		"authsvc POST /api/v1/break-glass/elevate":  false,
		"govsvc GET /api/v1/audit/export":           false,
		"mcpsvc POST /mcp":                          false,
	}
	for _, r := range Registry {
		key := r.Service + " " + r.Method + " " + r.Path
		if _, ok := required[key]; ok {
			required[key] = true
		}
	}
	for key, found := range required {
		if !found {
			t.Errorf("missing critical route in registry: %s", key)
		}
	}
	if len(MutatingWithPermission()) < 5 {
		t.Fatalf("expected mutating permission routes, got %d", len(MutatingWithPermission()))
	}
}
