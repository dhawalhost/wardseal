package auth

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"go.uber.org/zap"

	"github.com/dhawalhost/wardseal/internal/saml"
	"github.com/dhawalhost/wardseal/pkg/middleware"
)

const passwordLinkTenant = "11111111-1111-1111-1111-111111111111"

// passwordLinkStubService implements only what POST /api/v1/setup/password-link touches.
// Any other Service method panics through the nil embedded interface, which keeps the
// test honest about what the handler is allowed to call.
type passwordLinkStubService struct {
	Service
	tokensMinted int
	emailed      chan string
}

func (s *passwordLinkStubService) ValidateTokenContext(_ context.Context, token string) (*middleware.Claims, error) {
	switch token {
	case "member-token":
		return &middleware.Claims{
			RegisteredClaims: jwt.RegisteredClaims{Subject: "member-1"},
			Tenant:           passwordLinkTenant,
			Scope:            "openid profile",
		}, nil
	case "admin-token":
		return &middleware.Claims{
			RegisteredClaims: jwt.RegisteredClaims{Subject: "admin-1"},
			Tenant:           passwordLinkTenant,
			Scope:            "openid profile",
		}, nil
	}
	return nil, http.ErrNoCookie
}

func (s *passwordLinkStubService) GeneratePasswordSetupToken(_, _, _ string, _ int) (string, time.Time, error) {
	s.tokensMinted++
	return "signed-reset-token", time.Now().Add(time.Hour), nil
}

func (s *passwordLinkStubService) UIURL() string { return "http://id.example.test" }

// SAML is read once while routes are registered; nil means "no SAML provider".
func (s *passwordLinkStubService) SAML() *saml.Provider { return nil }

func (s *passwordLinkStubService) GetUserByID(_ context.Context, _, userID string) (UserProfile, error) {
	if userID == "ghost" {
		return UserProfile{}, errors.New("not found")
	}
	return UserProfile{ID: userID, Email: userID + "@example.test", Name: userID}, nil
}

func (s *passwordLinkStubService) SendPasswordSetupEmail(_ context.Context, _, userID, _ string, _ int) error {
	if s.emailed != nil {
		s.emailed <- userID
	}
	return nil
}

// roleChecker allows users:write only to the listed user IDs.
type roleChecker map[string]bool

func (c roleChecker) HasPermission(_ context.Context, _, userID, resource, action string) (bool, error) {
	return c[userID] && resource == "users" && action == "write", nil
}

func newPasswordLinkRouter(svc Service, checker middleware.PermissionChecker) *gin.Engine {
	gin.SetMode(gin.TestMode)
	h := NewHTTPHandler(svc, zap.NewNop(), nil, nil)
	if checker != nil {
		h.SetPermissionChecker(checker)
	}
	r := gin.New()
	h.RegisterRoutes(r)
	return r
}

func requestPasswordLink(r *gin.Engine, bearer, targetUser string, sendEmail bool) *httptest.ResponseRecorder {
	body := `{"user_id":"` + targetUser + `","mode":"reset","send_email":` + strconv.FormatBool(sendEmail) + `}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/setup/password-link", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+bearer)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)
	return resp
}

// A signed-in member with no admin permission must not be able to mint a reset
// token for another user. Before the fix the route only required a session, so a
// plain member received a valid reset token for the admin account in the response.
func TestPasswordLinkRejectsMemberMintingTokenForAnotherUser(t *testing.T) {
	svc := &passwordLinkStubService{}
	r := newPasswordLinkRouter(svc, roleChecker{"admin-1": true})

	resp := requestPasswordLink(r, "member-token", "admin-1", false)

	if resp.Code != http.StatusForbidden {
		t.Fatalf("member got status %d minting a reset token for another user; want 403. body=%s", resp.Code, resp.Body.String())
	}
	if svc.tokensMinted != 0 {
		t.Fatalf("a reset token was minted for a caller without permission (%d minted)", svc.tokensMinted)
	}
	var body map[string]any
	_ = json.Unmarshal(resp.Body.Bytes(), &body)
	if _, leaked := body["token"]; leaked {
		t.Fatalf("response leaked a reset token: %s", resp.Body.String())
	}
}

// With no permission checker wired the route must fail closed, never open.
func TestPasswordLinkFailsClosedWithoutPermissionChecker(t *testing.T) {
	svc := &passwordLinkStubService{}
	r := newPasswordLinkRouter(svc, nil)

	resp := requestPasswordLink(r, "admin-token", "member-1", false)

	if resp.Code < 400 || svc.tokensMinted != 0 {
		t.Fatalf("route was usable without a permission checker: status=%d minted=%d", resp.Code, svc.tokensMinted)
	}
}

func TestPasswordLinkRequiresSession(t *testing.T) {
	svc := &passwordLinkStubService{}
	r := newPasswordLinkRouter(svc, roleChecker{"admin-1": true})

	resp := requestPasswordLink(r, "not-a-real-token", "member-1", false)

	if resp.Code != http.StatusUnauthorized {
		t.Fatalf("want 401 without a valid session, got %d", resp.Code)
	}
}

// An administrator can still fetch a link to hand over out of band.
func TestPasswordLinkAdminGetsLinkWhenNotEmailed(t *testing.T) {
	svc := &passwordLinkStubService{}
	r := newPasswordLinkRouter(svc, roleChecker{"admin-1": true})

	resp := requestPasswordLink(r, "admin-token", "member-1", false)

	if resp.Code != http.StatusOK {
		t.Fatalf("admin got status %d; want 200. body=%s", resp.Code, resp.Body.String())
	}
	var body map[string]any
	if err := json.Unmarshal(resp.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body["token"] != "signed-reset-token" || !strings.Contains(body["url"].(string), "/set-password?token=") {
		t.Fatalf("admin response missing token/url: %s", resp.Body.String())
	}
}

// When the link is emailed it must go to the user's inbox only, not back to the caller.
func TestPasswordLinkEmailedLinkIsNotEchoedToCaller(t *testing.T) {
	svc := &passwordLinkStubService{emailed: make(chan string, 1)}
	r := newPasswordLinkRouter(svc, roleChecker{"admin-1": true})

	resp := requestPasswordLink(r, "admin-token", "member-1", true)

	if resp.Code != http.StatusAccepted {
		t.Fatalf("want 202, got %d body=%s", resp.Code, resp.Body.String())
	}
	if strings.Contains(resp.Body.String(), "signed-reset-token") || strings.Contains(resp.Body.String(), "set-password") {
		t.Fatalf("emailed link leaked into the response: %s", resp.Body.String())
	}
	select {
	case to := <-svc.emailed:
		if to != "member-1" {
			t.Fatalf("emailed %q, want member-1", to)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("no email was sent")
	}
}

func TestPasswordLinkUnknownUserIsNotFoundAndMintsNothing(t *testing.T) {
	svc := &passwordLinkStubService{}
	r := newPasswordLinkRouter(svc, roleChecker{"admin-1": true})

	resp := requestPasswordLink(r, "admin-token", "ghost", false)

	if resp.Code != http.StatusNotFound || svc.tokensMinted != 0 {
		t.Fatalf("want 404 and no token, got status=%d minted=%d", resp.Code, svc.tokensMinted)
	}
}
