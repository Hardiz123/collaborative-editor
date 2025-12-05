package errors

import (
	"fmt"
	"net/http"
)

// AppError represents an application error with HTTP status code
type AppError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Err     error  `json:"-"`
}

func (e *AppError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %v", e.Message, e.Err)
	}
	return e.Message
}

func (e *AppError) Unwrap() error {
	return e.Err
}

// NewAppError creates a new application error
func NewAppError(code int, message string, err error) *AppError {
	return &AppError{
		Code:    code,
		Message: message,
		Err:     err,
	}
}

// Predefined errors
var (
	ErrInvalidInput   = NewAppError(http.StatusBadRequest, "Invalid input", nil)
	ErrNotFound       = NewAppError(http.StatusNotFound, "Resource not found", nil)
	ErrConflict       = NewAppError(http.StatusConflict, "Resource already exists", nil)
	ErrInternalServer = NewAppError(http.StatusInternalServerError, "Internal server error", nil)
	ErrUnauthorized   = NewAppError(http.StatusUnauthorized, "Unauthorized", nil)
	ErrForbidden      = NewAppError(http.StatusForbidden, "Forbidden", nil)
)

// WrapError wraps an error with an AppError
func WrapError(appErr *AppError, err error) *AppError {
	return NewAppError(appErr.Code, appErr.Message, err)
}
