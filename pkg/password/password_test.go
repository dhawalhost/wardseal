package password

import (
	"strings"
	"testing"

	"golang.org/x/crypto/bcrypt"
)

func TestValidatePolicy(t *testing.T) {
	t.Parallel()
	if err := ValidatePolicy("Short1!"); err == nil {
		t.Fatal("expected too short")
	}
	if err := ValidatePolicy(strings.Repeat("A", 129) + "a1!"); err == nil {
		t.Fatal("expected too long")
	}
	if err := ValidatePolicy("password1234"); err == nil {
		t.Fatal("expected common password rejection")
	}
	if err := ValidatePolicy("alllowercase1!"); err == nil {
		t.Fatal("expected uppercase required")
	}
	if err := ValidatePolicy("ALLUPPERCASE1!"); err == nil {
		t.Fatal("expected lowercase required")
	}
	if err := ValidatePolicy("NoDigitsHere!"); err == nil {
		t.Fatal("expected digit required")
	}
	if err := ValidatePolicy("NoSpecialChar1"); err == nil {
		t.Fatal("expected special required")
	}
	if err := ValidatePolicy("GoodPassw0rd!"); err != nil {
		t.Fatalf("unexpected: %v", err)
	}
}

func TestHashVerifyArgon2id(t *testing.T) {
	t.Parallel()
	const pw = "GoodPassw0rd!"
	hash, err := Hash(pw)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(hash, "$argon2id$") {
		t.Fatalf("expected argon2id prefix, got %s", hash[:20])
	}
	if err := Verify(hash, pw); err != nil {
		t.Fatalf("verify failed: %v", err)
	}
	if err := Verify(hash, "WrongPassw0rd!"); err == nil {
		t.Fatal("expected mismatch")
	}
	if NeedsRehash(hash) {
		t.Fatal("fresh argon2id should not need rehash")
	}
}

func TestVerifyBcryptAndNeedsRehash(t *testing.T) {
	t.Parallel()
	const pw = "LegacyPassw0rd!"
	bcryptHash, err := bcrypt.GenerateFromPassword([]byte(pw), bcrypt.MinCost)
	if err != nil {
		t.Fatal(err)
	}
	if err := Verify(string(bcryptHash), pw); err != nil {
		t.Fatalf("bcrypt verify: %v", err)
	}
	if !NeedsRehash(string(bcryptHash)) {
		t.Fatal("bcrypt should need rehash")
	}
}
