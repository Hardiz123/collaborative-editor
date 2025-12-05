package validation

import (
	"fmt"
	"regexp"
	"strings"
)

var (
	emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
)

// ValidateSignupRequest validates user signup request
func ValidateSignupRequest(username, email, password string) error {
	var errors []string

	if username == "" {
		errors = append(errors, "username is required")
	} else if len(username) < 3 {
		errors = append(errors, "username must be at least 3 characters")
	} else if len(username) > 50 {
		errors = append(errors, "username must be less than 50 characters")
	} else if !isValidUsername(username) {
		errors = append(errors, "username can only contain letters, numbers, and underscores")
	}

	if email == "" {
		errors = append(errors, "email is required")
	} else if !emailRegex.MatchString(email) {
		errors = append(errors, "email format is invalid")
	}

	if password == "" {
		errors = append(errors, "password is required")
	} else if len(password) < 8 {
		errors = append(errors, "password must be at least 8 characters")
	} else if len(password) > 128 {
		errors = append(errors, "password must be less than 128 characters")
	}

	if len(errors) > 0 {
		return fmt.Errorf("validation failed: %s", strings.Join(errors, ", "))
	}

	return nil
}

// isValidUsername checks if username contains only valid characters
func isValidUsername(username string) bool {
	usernameRegex := regexp.MustCompile(`^[a-zA-Z0-9_]+$`)
	return usernameRegex.MatchString(username)
}
