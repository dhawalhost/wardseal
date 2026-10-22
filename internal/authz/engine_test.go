package authz

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

type mockAuthzRepo struct {
	tuples []RelationTuple
}

func (m *mockAuthzRepo) CreateTuple(ctx context.Context, tuple *RelationTuple) error {
	m.tuples = append(m.tuples, *tuple)
	return nil
}

func (m *mockAuthzRepo) DeleteTuple(ctx context.Context, tenantID, id string) error {
	var filtered []RelationTuple
	for _, t := range m.tuples {
		if t.ID != id {
			filtered = append(filtered, t)
		}
	}
	m.tuples = filtered
	return nil
}

func (m *mockAuthzRepo) DeleteByPattern(ctx context.Context, tenantID string, query Query) error {
	return nil
}

func (m *mockAuthzRepo) GetNamespace(ctx context.Context, tenantID, name string) (*Namespace, error) {
	return nil, nil
}

func (m *mockAuthzRepo) UpsertNamespace(ctx context.Context, ns *Namespace) error {
	return nil
}

func (m *mockAuthzRepo) ListTuples(ctx context.Context, tenantID string, query Query) ([]RelationTuple, error) {
	matched := make([]RelationTuple, 0, len(m.tuples))
	for _, t := range m.tuples {
		if query.ObjectID != "" && t.ObjectID != query.ObjectID {
			continue
		}
		if query.SubjectID != "" && t.SubjectID != query.SubjectID {
			continue
		}
		if query.Relation != "" && t.Relation != query.Relation {
			continue
		}
		if query.Namespace != "" && t.Namespace != query.Namespace {
			continue
		}
		matched = append(matched, t)
	}
	return matched, nil
}

func TestEngine_TwoTierCacheAndCheck(t *testing.T) {
	repo := &mockAuthzRepo{
		tuples: []RelationTuple{
			{
				TenantID:  "tenant-1",
				Namespace: "doc",
				ObjectID:  "doc-101",
				Relation:  "viewer",
				SubjectID: "user-alice",
			},
		},
	}

	engine := NewEngine(repo, zap.NewNop(), nil)

	ctx := context.Background()

	// 1. Initial check - should be allowed and populate cache
	allowed, err := engine.Check(ctx, "tenant-1", "user-alice", "user", "viewer", "doc", "doc-101")
	require.NoError(t, err)
	assert.True(t, allowed)

	// 2. Remove tuple from repo behind the scenes
	repo.tuples = nil

	// 3. Check again - should hit TwoTierCache L1 memory hit!
	allowedCached, err := engine.Check(ctx, "tenant-1", "user-alice", "user", "viewer", "doc", "doc-101")
	require.NoError(t, err)
	assert.True(t, allowedCached, "Expected L1 cache hit even though repo was emptied")

	// 4. Invalidate by tuple
	engine.InvalidateByTuple(ctx, "tenant-1", RelationTuple{
		TenantID:  "tenant-1",
		ObjectID:  "doc-101",
		SubjectID: "user-alice",
	})

	// 5. Check again - cache is invalidated, repo is empty, should return false
	allowedAfterInvalidate, err := engine.Check(ctx, "tenant-1", "user-alice", "user", "viewer", "doc", "doc-101")
	require.NoError(t, err)
	assert.False(t, allowedAfterInvalidate, "Expected false after cache invalidation")
}
