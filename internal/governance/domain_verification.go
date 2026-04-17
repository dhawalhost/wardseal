package governance

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/dhawalhost/gokit/response"
	"github.com/dhawalhost/wardseal/pkg/middleware"
	"github.com/go-chi/chi/v5"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// DomainVerificationResponse contains verification details.
type DomainVerificationResponse struct {
	Domain       string     `json:"domain"`
	Token        string     `json:"token,omitempty"`
	TxtRecord    string     `json:"txt_record"`
	Instructions string     `json:"instructions"`
	Verified     bool       `json:"verified"`
	ExpiresAt    *time.Time `json:"expires_at,omitempty"`
}

// DomainVerificationHandler handles domain verification API requests.
type DomainVerificationHandler struct {
	db     *gorm.DB
	store  OrganizationRepository
	logger *zap.Logger
}

// NewDomainVerificationHandler creates a new domain verification handler.
func NewDomainVerificationHandler(db *gorm.DB, store OrganizationRepository, logger *zap.Logger) *DomainVerificationHandler {
	return &DomainVerificationHandler{db: db, store: store, logger: logger}
}

// Register registers domain verification routes on the provided router.
func (h *DomainVerificationHandler) Register(r chi.Router) {
	r.Get("/{id}/domain-verification", h.getDomainVerification)
	r.Post("/{id}/domain-verification/generate", h.generateVerificationToken)
	r.Post("/{id}/domain-verification/verify", h.verifyDomain)
}

// Router registers domain verification routes and returns a new router.
func (h *DomainVerificationHandler) Router() http.Handler {
	r := chi.NewRouter()
	h.Register(r)
	return r
}

func (h *DomainVerificationHandler) tenantID(r *http.Request) (string, bool) {
	tenantID, ok := middleware.TenantIDFromContext(r.Context())
	if !ok {
		return "", false
	}
	return tenantID, true
}

func (h *DomainVerificationHandler) getDomainVerification(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}

	orgID := chi.URLParam(r, "id")
	org, err := h.store.Get(r.Context(), tenantID, orgID)
	if err != nil || org == nil {
		response.JSON(w, r, http.StatusNotFound, map[string]string{"error": "organization not found"})
		return
	}

	if org.Domain == nil || *org.Domain == "" {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "organization has no domain configured"})
		return
	}

	// Get verification token from DB
	var token *string
	var expiresAt *time.Time
	query := `SELECT domain_verification_token, domain_verification_expires_at FROM organizations WHERE id = $1`
	err = h.db.WithContext(r.Context()).Raw(query, orgID).Row().Scan(&token, &expiresAt)

	resp := DomainVerificationResponse{
		Domain:       *org.Domain,
		Verified:     org.DomainVerified,
		TxtRecord:    fmt.Sprintf("_wardseal.%s", *org.Domain),
		Instructions: "Add a TXT record to your DNS with the name and value shown below.",
	}

	if token != nil {
		resp.Token = *token
		resp.ExpiresAt = expiresAt
	}

	response.Ok(w, r, resp)
}

func (h *DomainVerificationHandler) generateVerificationToken(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}

	orgID := chi.URLParam(r, "id")
	org, err := h.store.Get(r.Context(), tenantID, orgID)
	if err != nil || org == nil {
		response.JSON(w, r, http.StatusNotFound, map[string]string{"error": "organization not found"})
		return
	}

	if org.Domain == nil || *org.Domain == "" {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "organization has no domain configured"})
		return
	}

	// Generate random token
	tokenBytes := make([]byte, 16)
	if _, err := rand.Read(tokenBytes); err != nil {
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to generate token"})
		return
	}
	token := "wardseal-verify=" + hex.EncodeToString(tokenBytes)
	expiresAt := time.Now().Add(7 * 24 * time.Hour) // 7 days validity

	// Store token
	query := `UPDATE organizations SET domain_verification_token = $1, domain_verification_expires_at = $2, domain_verified = FALSE WHERE id = $3`
	if err := h.db.WithContext(r.Context()).Exec(query, token, expiresAt, orgID).Error; err != nil {
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to save token"})
		return
	}

	response.Ok(w, r, DomainVerificationResponse{
		Domain:       *org.Domain,
		Token:        token,
		TxtRecord:    fmt.Sprintf("_wardseal.%s", *org.Domain),
		Instructions: fmt.Sprintf("Add a TXT record:\n  Name: _wardseal.%s\n  Value: %s", *org.Domain, token),
		Verified:     false,
		ExpiresAt:    &expiresAt,
	})
}

func (h *DomainVerificationHandler) verifyDomain(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}

	orgID := chi.URLParam(r, "id")
	org, err := h.store.Get(r.Context(), tenantID, orgID)
	if err != nil || org == nil {
		response.JSON(w, r, http.StatusNotFound, map[string]string{"error": "organization not found"})
		return
	}

	if org.Domain == nil || *org.Domain == "" {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "organization has no domain configured"})
		return
	}

	// Get expected token
	var token *string
	var expiresAt *time.Time
	query := `SELECT domain_verification_token, domain_verification_expires_at FROM organizations WHERE id = $1`
	if err := h.db.WithContext(r.Context()).Raw(query, orgID).Row().Scan(&token, &expiresAt); err != nil {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "no verification token generated"})
		return
	}

	if token == nil || *token == "" {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "no verification token generated"})
		return
	}

	if expiresAt != nil && time.Now().After(*expiresAt) {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "verification token expired, please generate a new one"})
		return
	}

	// Perform DNS TXT lookup
	txtRecordName := fmt.Sprintf("_wardseal.%s", *org.Domain)
	verified := h.verifyDNSTxtRecord(r.Context(), txtRecordName, *token)

	if verified {
		// Mark domain as verified
		updateQuery := `UPDATE organizations SET domain_verified = TRUE WHERE id = $1`
		_ = h.db.WithContext(r.Context()).Exec(updateQuery, orgID).Error

		response.Ok(w, r, map[string]interface{}{
			"verified": true,
			"message":  "Domain successfully verified!",
		})
	} else {
		response.Ok(w, r, map[string]interface{}{
			"verified": false,
			"message":  fmt.Sprintf("TXT record not found or doesn't match. Expected: %s at %s", *token, txtRecordName),
		})
	}
}

func (h *DomainVerificationHandler) verifyDNSTxtRecord(ctx context.Context, hostname, expectedValue string) bool {
	records, err := net.LookupTXT(hostname)
	if err != nil {
		return false
	}

	for _, record := range records {
		if strings.TrimSpace(record) == expectedValue {
			return true
		}
	}
	return false
}
