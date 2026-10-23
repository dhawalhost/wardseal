package password

// commonPasswords is an offline denylist of frequently breached / trivial passwords.
// Values are lowercase; ValidatePolicy compares strings.ToLower(password).
var commonPasswords = map[string]bool{
	"password": true, "password1": true, "password12": true, "password123": true,
	"password1234": true, "password12345": true, "passw0rd": true, "passw0rd!": true,
	"12345678": true, "123456789": true, "1234567890": true, "12345678901": true,
	"123456789012": true, "qwertyuiop": true, "qwerty123456": true, "asdfghjkl": true,
	"admin123": true, "admin1234": true, "admin12345": true, "administrator": true,
	"welcome1": true, "welcome12": true, "welcome123": true, "welcome1234": true,
	"wardseal123": true, "wardseal1234": true, "letmein12345": true, "changeme1234": true,
	"iloveyou123": true, "monkey123456": true, "dragon123456": true, "master123456": true,
	"login123456": true, "abc123456789": true, "trustno1!!!": true, "sunshine1234": true,
	"princess1234": true, "football1234": true, "baseball1234": true, "superman1234": true,
	"michael12345": true, "shadow123456": true, "mustang12345": true, "jennifer1234": true,
	"hunter123456": true, "buster123456": true, "soccer123456": true, "harley123456": true,
	"batman123456": true, "andrew123456": true, "tigger123456": true, "sunshine!!!!": true,
	"passw0rd!!!!": true, "p@ssw0rd!!!!": true, "p@ssword1234": true, "p@ssw0rd1234": true,
	"changeme!!!!": true, "default12345": true, "temp12345678": true, "temporary12!": true,
	"qwertyuiop12": true, "1q2w3e4r5t6y": true, "zaq12wsx!!!!": true, "xsw21qaz!!!!": true,
	"letmein!!!!!": true, "access123456": true, "hello1234567": true, "freedom12345": true,
	"whatever1234": true, "qazwsxedc123": true, "starwars1234": true, "computer1234": true,
	"internet1234": true, "service12345": true, "manager12345": true, "company12345": true,
	"spring2024!!": true, "summer2024!!": true, "winter2024!!": true, "autumn2024!!": true,
	"spring2025!!": true, "summer2025!!": true, "winter2025!!": true, "autumn2025!!": true,
	"wardseal!!!!": true, "wardseal2024": true, "wardseal2025": true, "identity1234": true,
}
