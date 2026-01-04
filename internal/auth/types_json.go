package auth

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
)

// JSON is a wrapper for JSONB fields that implements sql.Scanner and driver.Valuer.
type JSON json.RawMessage

// Scan implements the sql.Scanner interface.
func (j *JSON) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}
	result := json.RawMessage(bytes)
	*j = JSON(result)
	return nil
}

// Value implements the driver.Valuer interface.
func (j JSON) Value() (driver.Value, error) {
	if len(j) == 0 {
		return nil, nil
	}
	return json.RawMessage(j), nil
}
