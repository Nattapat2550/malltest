package handlers

import (
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"

	"backend/internal/pureapi"
)

// ---------- Helper Functions ----------

func isUsernameUniqueViolation(err error) bool {
	var pe *pureapi.Error
	if !errors.As(err, &pe) {
		return false
	}
	m, ok := pe.Detail.(map[string]any)
	if !ok {
		return false
	}
	eo, ok := m["error"].(map[string]any)
	if !ok {
		return false
	}
	d, _ := eo["details"].(string)
	d = strings.ToLower(d)
	return strings.Contains(d, "duplicate key") && strings.Contains(d, "users_username_key")
}

func readImageDataURL(r *http.Request, field string, maxBytes int64) (string, error) {
	f, hdr, err := r.FormFile(field)
	if err != nil {
		return "", fmt.Errorf("No image")
	}
	defer f.Close()

	mime := hdr.Header.Get("Content-Type")
	if mime == "" {
		mime = hdr.Header.Get("content-type")
	}
	mime = strings.ToLower(strings.TrimSpace(mime))
	if !strings.HasPrefix(mime, "image/") {
		return "", fmt.Errorf("Unsupported file type")
	}
	if !allowedImageMime(mime) {
		return "", fmt.Errorf("Unsupported file type")
	}

	b, err := io.ReadAll(f)
	if err != nil {
		return "", fmt.Errorf("Read failed")
	}
	if int64(len(b)) > maxBytes {
		return "", fmt.Errorf("File too large")
	}
	enc := base64.StdEncoding.EncodeToString(b)
	return fmt.Sprintf("data:%s;base64,%s", mime, enc), nil
}

func tryReadImageDataURL(r *http.Request, field string, maxBytes int64) (string, error) {
	f, hdr, err := r.FormFile(field)
	if err != nil {
		return "", nil
	}
	defer f.Close()

	mime := hdr.Header.Get("Content-Type")
	if mime == "" {
		mime = hdr.Header.Get("content-type")
	}
	mime = strings.ToLower(strings.TrimSpace(mime))
	if !strings.HasPrefix(mime, "image/") {
		return "", fmt.Errorf("Unsupported file type")
	}
	if !allowedImageMime(mime) {
		return "", fmt.Errorf("Unsupported file type")
	}

	b, err := io.ReadAll(f)
	if err != nil {
		return "", fmt.Errorf("Read failed")
	}
	if int64(len(b)) > maxBytes {
		return "", fmt.Errorf("File too large")
	}
	enc := base64.StdEncoding.EncodeToString(b)
	return fmt.Sprintf("data:%s;base64,%s", mime, enc), nil
}

func allowedImageMime(m string) bool {
	switch m {
	case "image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp":
		return true
	default:
		return false
	}
}