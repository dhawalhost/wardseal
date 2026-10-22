package authz

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/dhawalhost/gokit/cache"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

const (
	MaxDepth = 10 // Prevent infinite recursion
)

// Engine performs recursive relationship checks with granular caching.
type Engine struct {
	repo        Repository
	log         *zap.Logger
	redisClient redis.UniversalClient
	twoTier     *cache.TwoTierCache
}

// memoryL2Fallback is used when Redis is not provided (e.g. in standalone tests).
type memoryL2Fallback struct {
	mu   sync.RWMutex
	data map[string]string
}

func newMemoryL2Fallback() *memoryL2Fallback {
	return &memoryL2Fallback{data: make(map[string]string)}
}

func (m *memoryL2Fallback) Get(ctx context.Context, key string) (string, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	val, ok := m.data[key]
	if !ok {
		return "", cache.ErrNotFound
	}
	return val, nil
}

func (m *memoryL2Fallback) Set(ctx context.Context, key string, value any, ttl time.Duration) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.data[key] = fmt.Sprintf("%v", value)
	return nil
}

func (m *memoryL2Fallback) Delete(ctx context.Context, keys ...string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, k := range keys {
		delete(m.data, k)
	}
	return nil
}

func (m *memoryL2Fallback) Exists(ctx context.Context, key string) (bool, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	_, ok := m.data[key]
	return ok, nil
}

func (m *memoryL2Fallback) Flush(ctx context.Context) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.data = make(map[string]string)
	return nil
}

func NewEngine(repo Repository, log *zap.Logger, rc redis.UniversalClient) *Engine {
	var l2 cache.Cache
	if rc != nil {
		l2 = cache.NewRedisFromClient(rc)
	} else {
		l2 = newMemoryL2Fallback()
	}

	tt := cache.NewTwoTier(l2, cache.TwoTierConfig{
		L1TTL:        10 * time.Second,
		L1MaxEntries: 20000,
	})

	return &Engine{
		repo:        repo,
		log:         log,
		redisClient: rc,
		twoTier:     tt,
	}
}

// Check determines if a subject has a specific relation to an object.
func (e *Engine) Check(ctx context.Context, tenantID, subID, subType, rel, ns, objID string) (bool, error) {
	// 1. Check two-tier cache (sub-microsecond L1 hit, falls back to L2 Redis)
	cacheKey := fmt.Sprintf("authz:cache:%s:%s:%s:%s:%s:%s", tenantID, subID, subType, rel, ns, objID)
	if val, err := e.twoTier.Get(ctx, cacheKey); err == nil {
		return val == "true", nil
	}

	// 2. Perform recursive check
	allowed, err := e.checkRecursive(ctx, tenantID, subID, subType, rel, ns, objID, 0)
	if err == nil {
		ttl := cache.JitterTTL(5*time.Minute, 0.10)
		_ = e.twoTier.Set(ctx, cacheKey, fmt.Sprintf("%t", allowed), ttl)
	}
	return allowed, err
}

// InvalidateByTuple clears cache entries affected by a specific tuple change.
func (e *Engine) InvalidateByTuple(ctx context.Context, tenantID string, tuple RelationTuple) {
	if e.redisClient != nil {
		// Use SCAN to find keys involving this tenant and either the object or subject
		// Note: SCAN is preferred over KEYS for performance in production.
		matchPrefix := fmt.Sprintf("authz:cache:%s:*", tenantID)
		var cursor uint64
		for {
			var keys []string
			var err error
			keys, cursor, err = e.redisClient.Scan(ctx, cursor, matchPrefix, 100).Result()
			if err != nil {
				e.log.Warn("Failed to scan redis for cache invalidation", zap.Error(err))
				break
			}
			var keysToDelete []string
			for _, k := range keys {
				if strings.Contains(k, tuple.ObjectID) || strings.Contains(k, tuple.SubjectID) {
					keysToDelete = append(keysToDelete, k)
				}
			}
			if len(keysToDelete) > 0 {
				_ = e.twoTier.Delete(ctx, keysToDelete...)
			}
			if cursor == 0 {
				break
			}
		}
	} else {
		_ = e.twoTier.Flush(ctx)
	}
}

func (e *Engine) ListTuples(ctx context.Context, tenantID string, query Query) ([]RelationTuple, error) {
	return e.repo.ListTuples(ctx, tenantID, query)
}

// Traverse recursively collects all relation tuples starting from a subject handle.
func (e *Engine) Traverse(ctx context.Context, tenantID, subjectID string) ([]RelationTuple, error) {
	var results []RelationTuple
	visited := make(map[string]bool)

	// BFS for relationship propagation
	queue := []string{subjectID}
	visited[subjectID] = true

	depth := 0
	for len(queue) > 0 && depth < MaxDepth {
		var nextQueue []string
		for _, currentSub := range queue {
			// Find tuples where currentSub is the subject
			tuples, err := e.repo.ListTuples(ctx, tenantID, Query{
				SubjectID: currentSub,
			})
			if err != nil {
				return nil, err
			}

			for _, t := range tuples {
				results = append(results, t)

				// If ObjectID hasn't been visited, add to next iteration
				// This allows us to find indirect memberships (Group -> Group -> Role)
				if !visited[t.ObjectID] {
					visited[t.ObjectID] = true
					nextQueue = append(nextQueue, t.ObjectID)
				}
			}
		}
		queue = nextQueue
		depth++
	}

	return results, nil
}

func (e *Engine) checkRecursive(ctx context.Context, tenantID, subID, subType, rel, ns, objID string, depth int) (bool, error) {
	if depth > MaxDepth {
		return false, fmt.Errorf("max depth exceeded in graph traversal")
	}

	// 1. DIRECT CHECK: (ns:objID)#rel@sub
	tuples, err := e.repo.ListTuples(ctx, tenantID, Query{
		Namespace:   ns,
		ObjectID:    objID,
		Relation:    rel,
		SubjectType: subType,
		SubjectID:   subID,
	})
	if err == nil && len(tuples) > 0 {
		return true, nil
	}

	// 2. USERSET CHECK (Indirection)
	// Example: (folder:A)#viewer @ (project:P)#member
	// If the above tuple exists, we then need to check:
	// does (subID) have 'member' on (project:P)?

	// We look for any tuple matching (ns:objID)#rel where subject is a 'set'
	indirectionTuples, err := e.repo.ListTuples(ctx, tenantID, Query{
		Namespace:   ns,
		ObjectID:    objID,
		Relation:    rel,
		SubjectType: "set",
	})
	if err != nil {
		return false, err
	}

	for _, t := range indirectionTuples {
		// t.SubjectID is the 'parent' object (e.g. 'project:P')
		// t.SubjectRelation is the relation on that parent (e.g. 'member')

		// t.SubjectID is expected to be in format "namespace:objectID"
		// but since we only have subject_id in the table, we might need a parser
		// For WardSeal ReBAC, we store SubjectID as the ID and assume SubjectType context.
		// Usually SubjectID = actual ID, and for 'set', the SubjectRelation tells us what to check.

		if t.SubjectRelation == nil {
			continue
		}

		// Recurse: Does the user have the SubjectRelation on t.SubjectID?
		// Note: We need to know the namespace of t.SubjectID.
		// For now, we assume the subject namespace is part of the 'Namespace' config or implicit.
		// In a full Zanzibar, the subject_id is actually another object.

		subjectNS := ns
		subjectObjID := t.SubjectID
		if parts := strings.SplitN(t.SubjectID, ":", 2); len(parts) == 2 {
			subjectNS = parts[0]
			subjectObjID = parts[1]
		}

		allowed, err := e.checkRecursive(ctx, tenantID, subID, subType, *t.SubjectRelation, subjectNS, subjectObjID, depth+1)
		if err == nil && allowed {
			return true, nil
		}
	}

	return false, nil
}
