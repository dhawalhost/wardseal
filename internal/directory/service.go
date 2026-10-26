package directory

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/dhawalhost/gokit/search"
	"github.com/dhawalhost/wardseal/pkg/eventbus"
	"github.com/dhawalhost/wardseal/pkg/password"
	"github.com/lib/pq"

	"github.com/jmoiron/sqlx"
)

// UserManager defines operations on user identities.
type UserManager interface {
	CreateUser(ctx context.Context, tenantID string, user User) (string, error)
	GetUserByID(ctx context.Context, tenantID, id string) (User, error)
	GetUserByEmail(ctx context.Context, tenantID, email string) (User, error)
	ListUsers(ctx context.Context, tenantID string, limit, offset int) ([]User, int, error)
	SearchUsers(ctx context.Context, tenantID, query string, limit int) ([]User, error)
	ListPendingDeletions(ctx context.Context, olderThan time.Time) ([]User, error)
	UpdateUser(ctx context.Context, tenantID, id string, user User) error
	DeleteUser(ctx context.Context, tenantID, id string) error
}

// GroupManager defines operations on groups and group memberships.
type GroupManager interface {
	CreateGroup(ctx context.Context, tenantID string, group Group) (string, error)
	GetGroupByID(ctx context.Context, tenantID, id string) (Group, error)
	ListGroups(ctx context.Context, tenantID string, limit, offset int) ([]Group, int, error)
	UpdateGroup(ctx context.Context, tenantID, id string, group Group) error
	DeleteGroup(ctx context.Context, tenantID, id string) error

	AddUserToGroup(ctx context.Context, tenantID, userID, groupID string) error
	RemoveUserFromGroup(ctx context.Context, tenantID, userID, groupID string) error
	ListGroupMembers(ctx context.Context, tenantID, groupID string) ([]User, error)
	ListUserGroups(ctx context.Context, tenantID, userID string) ([]Group, error)
}

// CredentialVerifier handles credential verification.
type CredentialVerifier interface {
	VerifyCredentials(ctx context.Context, tenantID, email, password string) (User, error)
}

// OrganizationManager defines operations on user-organization mappings.
type OrganizationManager interface {
	AddUserToOrganization(ctx context.Context, tenantID, userID, orgID, role string) error
	RemoveUserFromOrganization(ctx context.Context, tenantID, userID, orgID string) error
	ListUserOrganizations(ctx context.Context, tenantID, userID string) ([]string, error)
}

// TenantManager defines operations for tenant lifecycle and discovery.
type TenantManager interface {
	GetTenantByEmail(ctx context.Context, email string) (string, error)
	CreateTenant(ctx context.Context, id, name, slug, plan string) error
	GetTenantIDBySlug(ctx context.Context, slug string) (string, error)
}

// Service defines the unified interface for the directory service, composed of focused sub-interfaces.
type Service interface {
	HealthCheck(ctx context.Context) (bool, error)
	UserManager
	GroupManager
	CredentialVerifier
	OrganizationManager
	TenantManager
}

type directoryService struct {
	repo            Repository
	bus             eventbus.EventBus
	passwordHistory map[string][]string
	searchIndex     *search.MemoryIndex
	mu              sync.RWMutex
}

var ErrInvalidCredentials = errors.New("invalid credentials")
var ErrAlreadyExists = errors.New("already exists")
var ErrEmailAlreadyExistsGlobally = errors.New("email already in use globally")

// NewService creates a new directory service.
func NewService(repo Repository, bus eventbus.EventBus) Service {
	idxCfg := search.IndexConfig{
		DefaultAnalyzer: search.NewStandardAnalyzer(),
		FieldAnalyzers: map[string]*search.Analyzer{
			"display_name": search.NewAutocompleteAnalyzer(2, 15),
			"email":        search.NewAutocompleteAnalyzer(2, 15),
		},
	}

	return &directoryService{
		repo:            repo,
		bus:             bus,
		passwordHistory: make(map[string][]string),
		searchIndex:     search.NewMemoryIndex(idxCfg),
	}
}

func (s *directoryService) HealthCheck(ctx context.Context) (bool, error) {
	if err := s.repo.HealthCheck(ctx); err != nil {
		return false, err
	}
	return true, nil
}

func (s *directoryService) CreateUser(ctx context.Context, tenantID string, user User) (string, error) {
	if err := password.ValidatePolicy(user.Password); err != nil {
		return "", err
	}

	hashedPassword, err := password.Hash(user.Password)
	if err != nil {
		return "", err
	}

	var userID string
	err = s.repo.WithTransaction(ctx, func(tx *sqlx.Tx) error {
		var err error
		userID, err = s.repo.CreateIdentity(ctx, tx, CreateIdentityParams{
			TenantID:     tenantID,
			DisplayName:  user.DisplayName,
			ExternalID:   user.ExternalID,
			PhoneNumbers: user.PhoneNumbers,
			Department:   user.Department,
			Title:        user.Title,
			Timezone:     user.Timezone,
		})
		if err != nil {
			return err
		}

		err = s.repo.CreateAccount(ctx, tx, userID, tenantID, user.Email, hashedPassword)
		if err != nil {
			if isAccountLoginUniqueViolation(err) {
				return ErrEmailAlreadyExistsGlobally
			}
			return err
		}
		return nil
	})

	if err == nil {
		user.ID = userID
		s.indexUserDoc(ctx, tenantID, user)
		if s.bus != nil {
			payload, _ := json.Marshal(map[string]string{
				"tenant_id": tenantID,
				"user_id":   userID,
				"email":     user.Email,
			})
			_ = s.bus.Publish(ctx, "UserCreated", payload)
		}
	}
	return userID, err
}

func (s *directoryService) GetUserByID(ctx context.Context, tenantID, id string) (User, error) {
	return s.repo.GetUserByID(ctx, tenantID, id)
}

func (s *directoryService) GetUserByEmail(ctx context.Context, tenantID, email string) (User, error) {
	return s.repo.GetUserByEmail(ctx, tenantID, email)
}

func (s *directoryService) ListUserGroups(ctx context.Context, tenantID, userID string) ([]Group, error) {
	return s.repo.ListUserGroups(ctx, tenantID, userID)
}

func (s *directoryService) ListUsers(ctx context.Context, tenantID string, limit, offset int) ([]User, int, error) {
	return s.repo.ListUsers(ctx, tenantID, limit, offset)
}

func (s *directoryService) ListPendingDeletions(ctx context.Context, olderThan time.Time) ([]User, error) {
	return s.repo.ListPendingDeletions(ctx, olderThan)
}

func (s *directoryService) UpdateUser(ctx context.Context, tenantID, id string, user User) error {
	if user.Password != "" {
		if err := password.ValidatePolicy(user.Password); err != nil {
			return err
		}

		s.mu.RLock()
		history := s.passwordHistory[id]
		s.mu.RUnlock()

		for _, oldHash := range history {
			if err := password.Verify(oldHash, user.Password); err == nil {
				return errors.New("password has been used recently")
			}
		}
	}

	err := s.repo.WithTransaction(ctx, func(tx *sqlx.Tx) error {
		var passwordHash string
		if user.Password != "" {
			hp, err := password.Hash(user.Password)
			if err != nil {
				return err
			}
			passwordHash = hp
		}

		if err := s.repo.UpdateIdentity(ctx, tx, UpdateIdentityParams{
			TenantID:     tenantID,
			ID:           id,
			Status:       user.Status,
			DisplayName:  user.DisplayName,
			ExternalID:   user.ExternalID,
			PhoneNumbers: user.PhoneNumbers,
			Department:   user.Department,
			Title:        user.Title,
			Timezone:     user.Timezone,
			MFAEnforced:  user.MFAEnforced,
		}); err != nil {
			return err
		}

		return s.repo.UpdateAccount(ctx, tx, tenantID, id, user.Email, passwordHash)
	})

	if err == nil {
		updatedUser, errGet := s.GetUserByID(ctx, tenantID, id)
		if errGet == nil {
			s.indexUserDoc(ctx, tenantID, updatedUser)
		}

		if user.Password != "" {
			s.mu.Lock()
			history := s.passwordHistory[id]
			if len(history) >= 5 {
				history = history[1:]
			}
			hp, hashErr := password.Hash(user.Password)
			if hashErr == nil {
				s.passwordHistory[id] = append(history, hp)
			}
			s.mu.Unlock()
		}
	}

	return err
}

func (s *directoryService) DeleteUser(ctx context.Context, tenantID, id string) error {
	err := s.repo.DeleteIdentity(ctx, tenantID, id)
	if err == nil {
		if s.searchIndex != nil {
			_ = s.searchIndex.Delete(ctx, id)
		}
		if s.bus != nil {
			payload, _ := json.Marshal(map[string]string{
				"tenant_id": tenantID,
				"user_id":   id,
			})
			_ = s.bus.Publish(ctx, "UserDeactivated", payload)
		}
	}
	return err
}

func (s *directoryService) SearchUsers(ctx context.Context, tenantID, query string, limit int) ([]User, error) {
	if limit <= 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}

	query = strings.TrimSpace(query)
	if query == "" {
		users, _, err := s.ListUsers(ctx, tenantID, limit, 0)
		return users, err
	}

	if s.searchIndex == nil {
		users, _, err := s.ListUsers(ctx, tenantID, limit, 0)
		return users, err
	}

	boolQ := search.NewBoolQuery()
	boolQ.FilterClause(search.NewTagQuery("tenant:" + tenantID))

	mmQ := search.NewMultiMatchQuery(query, "display_name", "email", "department", "title")
	mmQ.SetFieldBoost("display_name", 2.0)
	mmQ.SetFieldBoost("email", 1.5)
	boolQ.MustClause(mmQ)

	res, err := s.searchIndex.Search(ctx, search.Request{
		Query: boolQ,
		Limit: limit,
	})
	if err != nil {
		return nil, fmt.Errorf("search failed: %w", err)
	}

	users := make([]User, 0, len(res.Hits))
	for _, hit := range res.Hits {
		u, err := s.GetUserByID(ctx, tenantID, hit.DocID)
		if err != nil {
			continue
		}
		users = append(users, u)
	}
	return users, nil
}

func (s *directoryService) indexUserDoc(ctx context.Context, tenantID string, user User) {
	if s.searchIndex == nil || user.ID == "" {
		return
	}
	doc := search.NewDocument(user.ID)
	doc.AddTag("tenant:" + tenantID)
	doc.SetField("email", user.Email)
	if user.DisplayName != nil {
		doc.SetField("display_name", *user.DisplayName)
	}
	if user.Department != nil {
		doc.SetField("department", *user.Department)
	}
	if user.Title != nil {
		doc.SetField("title", *user.Title)
	}
	_ = s.searchIndex.Index(ctx, doc)
}

func (s *directoryService) CreateGroup(ctx context.Context, tenantID string, group Group) (string, error) {
	return s.repo.CreateGroup(ctx, tenantID, group.Name)
}

func (s *directoryService) GetGroupByID(ctx context.Context, tenantID, id string) (Group, error) {
	return s.repo.GetGroupByID(ctx, tenantID, id)
}

func (s *directoryService) ListGroups(ctx context.Context, tenantID string, limit, offset int) ([]Group, int, error) {
	return s.repo.ListGroups(ctx, tenantID, limit, offset)
}

func (s *directoryService) UpdateGroup(ctx context.Context, tenantID, id string, group Group) error {
	return s.repo.UpdateGroup(ctx, tenantID, id, group.Name)
}

func (s *directoryService) DeleteGroup(ctx context.Context, tenantID, id string) error {
	return s.repo.DeleteGroup(ctx, tenantID, id)
}

func (s *directoryService) AddUserToGroup(ctx context.Context, tenantID, userID, groupID string) error {
	err := s.repo.AddUserToGroup(ctx, tenantID, userID, groupID)
	if err == nil && s.bus != nil {
		payload, _ := json.Marshal(map[string]string{
			"tenant_id": tenantID,
			"user_id":   userID,
			"group_id":  groupID,
			"action":    "add",
		})
		_ = s.bus.Publish(ctx, "GroupMembershipChanged", payload)
	}
	return err
}

func (s *directoryService) RemoveUserFromGroup(ctx context.Context, tenantID, userID, groupID string) error {
	err := s.repo.RemoveUserFromGroup(ctx, tenantID, userID, groupID)
	if err == nil && s.bus != nil {
		payload, _ := json.Marshal(map[string]string{
			"tenant_id": tenantID,
			"user_id":   userID,
			"group_id":  groupID,
			"action":    "remove",
		})
		_ = s.bus.Publish(ctx, "GroupMembershipChanged", payload)
	}
	return err
}

func (s *directoryService) ListGroupMembers(ctx context.Context, tenantID, groupID string) ([]User, error) {
	return s.repo.ListGroupMembers(ctx, tenantID, groupID)
}

func (s *directoryService) VerifyCredentials(ctx context.Context, tenantID, email, plainPassword string) (User, error) {
	user, hash, err := s.repo.GetPasswordHash(ctx, tenantID, email)
	if err != nil {
		return User{}, ErrInvalidCredentials
	}

	if err := password.Verify(hash, plainPassword); err != nil {
		return User{}, ErrInvalidCredentials
	}

	// Transparent upgrade from bcrypt (or outdated Argon2id params) on successful login.
	if password.NeedsRehash(hash) {
		if newHash, hashErr := password.Hash(plainPassword); hashErr == nil {
			_ = s.repo.WithTransaction(ctx, func(tx *sqlx.Tx) error {
				return s.repo.UpdateAccount(ctx, tx, tenantID, user.ID, user.Email, newHash)
			})
		}
	}

	return user, nil
}

func (s *directoryService) GetTenantByEmail(ctx context.Context, email string) (string, error) {
	return s.repo.GetTenantIDByEmail(ctx, email)
}

func (s *directoryService) CreateTenant(ctx context.Context, id, name, slug, plan string) error {
	err := s.repo.CreateTenant(ctx, id, name, slug, plan)
	if err != nil {
		if isPostgresUniqueViolation(err) {
			return ErrAlreadyExists
		}
	}
	return err
}

// isPostgresUniqueViolation checks if an error represents a Postgres unique constraint violation (code 23505),
// with a string-based fallback for mocked drivers or sqlite.
func isPostgresUniqueViolation(err error) bool {
	if err == nil {
		return false
	}
	var pqErr *pq.Error
	if errors.As(err, &pqErr) {
		return pqErr.Code == "23505"
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "unique constraint") || strings.Contains(msg, "duplicate key")
}

// isAccountLoginUniqueViolation checks if an error is a unique constraint violation on accounts_login_key.
func isAccountLoginUniqueViolation(err error) bool {
	if err == nil {
		return false
	}
	var pqErr *pq.Error
	if errors.As(err, &pqErr) {
		if pqErr.Code == "23505" {
			return pqErr.Constraint == "accounts_login_key" || strings.Contains(pqErr.Message, "accounts_login_key") || strings.Contains(pqErr.Detail, "accounts_login_key")
		}
		return false
	}
	msg := strings.ToLower(err.Error())
	return (strings.Contains(msg, "unique constraint") || strings.Contains(msg, "duplicate key")) && strings.Contains(msg, "accounts_login_key")
}

func (s *directoryService) GetTenantIDBySlug(ctx context.Context, slug string) (string, error) {
	return s.repo.GetTenantIDBySlug(ctx, slug)
}

func (s *directoryService) AddUserToOrganization(ctx context.Context, tenantID, userID, orgID, role string) error {
	if role == "" {
		role = "member"
	}
	return s.repo.AddUserToOrganization(ctx, tenantID, userID, orgID, role)
}

func (s *directoryService) RemoveUserFromOrganization(ctx context.Context, tenantID, userID, orgID string) error {
	return s.repo.RemoveUserFromOrganization(ctx, tenantID, userID, orgID)
}

func (s *directoryService) ListUserOrganizations(ctx context.Context, tenantID, userID string) ([]string, error) {
	return s.repo.ListUserOrganizations(ctx, tenantID, userID)
}
