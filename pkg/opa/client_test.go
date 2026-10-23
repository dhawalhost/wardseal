package opa

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestOPAClient_Check(t *testing.T) {
	t.Run("allowed response", func(t *testing.T) {
		ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			assert.Equal(t, "POST", r.Method)
			assert.Equal(t, "application/json", r.Header.Get("Content-Type"))

			var req Request
			err := json.NewDecoder(r.Body).Decode(&req)
			require.NoError(t, err)
			assert.Equal(t, "alice", req.Input.User)
			assert.Equal(t, "read", req.Input.Action)
			assert.Equal(t, "document-1", req.Input.Object)

			var resp Response
			resp.Result.Allow = true
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(resp)
		}))
		defer ts.Close()

		client := NewClient(ts.URL)
		allow, err := client.Check(context.Background(), Input{
			User:   "alice",
			Action: "read",
			Object: "document-1",
		})
		require.NoError(t, err)
		assert.True(t, allow)
	})

	t.Run("denied response", func(t *testing.T) {
		ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			var resp Response
			resp.Result.Allow = false
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(resp)
		}))
		defer ts.Close()

		client := NewClient(ts.URL)
		allow, err := client.Check(context.Background(), Input{
			User:   "bob",
			Action: "write",
			Object: "document-1",
		})
		require.NoError(t, err)
		assert.False(t, allow)
	})

	t.Run("server error status", func(t *testing.T) {
		ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusInternalServerError)
		}))
		defer ts.Close()

		client := NewClient(ts.URL)
		_, err := client.Check(context.Background(), Input{User: "charlie"})
		require.Error(t, err)
		assert.Contains(t, err.Error(), "OPA returned status: 500")
	})
}
