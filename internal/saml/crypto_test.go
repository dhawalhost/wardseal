package saml

import (
	"crypto/x509"
	"encoding/pem"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGenerateSelfSignedCredentials(t *testing.T) {
	entityID := "https://idp.wardseal.io/metadata"
	certPEM, keyPEM, err := GenerateSelfSignedCredentials(entityID)
	require.NoError(t, err)
	require.NotEmpty(t, certPEM)
	require.NotEmpty(t, keyPEM)

	// Decode cert block
	certBlock, _ := pem.Decode(certPEM)
	require.NotNil(t, certBlock)
	assert.Equal(t, "CERTIFICATE", certBlock.Type)

	cert, err := x509.ParseCertificate(certBlock.Bytes)
	require.NoError(t, err)
	assert.Equal(t, entityID, cert.Subject.CommonName)
	assert.Equal(t, []string{"WardSeal Identity Platform"}, cert.Subject.Organization)

	// Decode key block
	keyBlock, _ := pem.Decode(keyPEM)
	require.NotNil(t, keyBlock)
	assert.Equal(t, "RSA PRIVATE KEY", keyBlock.Type)

	privKey, err := x509.ParsePKCS1PrivateKey(keyBlock.Bytes)
	require.NoError(t, err)
	assert.Equal(t, 2048, privKey.N.BitLen())
}
