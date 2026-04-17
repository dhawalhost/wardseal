package auth

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/dhawalhost/gokit/response"
	"go.uber.org/zap"
)

// IngestSignalRequest defines the payload for ingestion.
type IngestSignalRequest struct {
	SubjectID string `json:"subject_id"`
	EventType string `json:"event_type"`
	Reason    string `json:"reason"`
}

// ingestSignal handles the POST /api/v1/signals/ingest
func (h *HTTPHandler) ingestSignal(w http.ResponseWriter, r *http.Request) {
	var req IngestSignalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}

	event := &SecurityEvent{
		TenantID:  tenantID,
		SubjectID: req.SubjectID,
		EventType: req.EventType,
		Reason:    req.Reason,
		EventTime: time.Now(),
	}

	if err := h.svc.Signal().Ingest(r.Context(), event); err != nil {
		h.logger.Error("Failed to ingest signal", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to ingest signal"})
		return
	}

	response.JSON(w, r, http.StatusAccepted, map[string]string{"message": "signal ingested"})
}
