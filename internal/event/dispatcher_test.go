package event

import (
	"net"
	"testing"
)

func TestIsPrivateIP(t *testing.T) {
	t.Parallel()
	cases := []struct {
		ip      string
		private bool
	}{
		{"127.0.0.1", true},
		{"10.0.0.5", true},
		{"192.168.1.1", true},
		{"169.254.169.254", true},
		{"8.8.8.8", false},
		{"1.1.1.1", false},
	}
	for _, tc := range cases {
		ip := net.ParseIP(tc.ip)
		if got := isPrivateIP(ip); got != tc.private {
			t.Fatalf("%s: got private=%v want %v", tc.ip, got, tc.private)
		}
	}
}
