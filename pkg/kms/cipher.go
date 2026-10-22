package kms

import (
	"context"
	"fmt"

	gokitcrypto "github.com/dhawalhost/gokit/crypto"
)

// NewCipher creates a new Cipher based on the configuration.
func NewCipher(cfg Config) (Cipher, error) {
	switch cfg.Provider {
	case "local", "":
		if cfg.MasterKey.IsEmpty() {
			return nil, fmt.Errorf("master key is required for local encryption")
		}
		return NewLocalCipher(cfg.MasterKey.Raw())
	case "vault":
		// Vault implementation would go here, leveraging the vault client
		return nil, fmt.Errorf("vault cipher not implemented in this phase")
	default:
		return nil, fmt.Errorf("unknown KMS provider: %s", cfg.Provider)
	}
}

// localCipher implements Cipher using AES-GCM via gokit/crypto.
type localCipher struct {
	key []byte
}

// NewLocalCipher creates a new AES-GCM cipher.
func NewLocalCipher(key string) (Cipher, error) {
	// Key must be exactly 32 bytes for AES-256
	kb := []byte(key)
	if len(kb) != 32 {
		return nil, fmt.Errorf("local master key must be exactly 32 bytes (256-bit)")
	}
	return &localCipher{key: kb}, nil
}

func (c *localCipher) Encrypt(_ context.Context, plaintext []byte) ([]byte, error) {
	return gokitcrypto.Encrypt(plaintext, c.key)
}

func (c *localCipher) Decrypt(_ context.Context, ciphertext []byte) ([]byte, error) {
	return gokitcrypto.Decrypt(ciphertext, c.key)
}

func (c *localCipher) Close() error {
	return nil
}
