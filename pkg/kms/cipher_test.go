package kms

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLocalCipher_EncryptDecrypt(t *testing.T) {
	key32 := "01234567890123456789012345678901" // 32 bytes

	cipher, err := NewLocalCipher(key32)
	require.NoError(t, err)
	defer cipher.Close()

	ctx := context.Background()
	plaintext := []byte("confidential identity payload")

	ciphertext, err := cipher.Encrypt(ctx, plaintext)
	require.NoError(t, err)
	assert.NotEqual(t, plaintext, ciphertext)

	decrypted, err := cipher.Decrypt(ctx, ciphertext)
	require.NoError(t, err)
	assert.Equal(t, plaintext, decrypted)
}

func TestLocalCipher_InvalidKeyLength(t *testing.T) {
	_, err := NewLocalCipher("short-key")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "must be exactly 32 bytes")
}
