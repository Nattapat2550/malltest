// backend/internal/handlers/auth_google.go
package handlers

import (
	"fmt"
	"net/http"
	"net/url"
	"strings"
)

// GET /api/auth/google
func (h *Handler) AuthGoogleStart(w http.ResponseWriter, r *http.Request) {
	u, ok := h.Google.AuthURL("state")
	if !ok {
		h.writeError(w, http.StatusServiceUnavailable, "Google login is temporarily unavailable. Please try again in a moment.")
		return
	}
	http.Redirect(w, r, u, http.StatusFound)
}

// GET /api/auth/google/callback
func (h *Handler) AuthGoogleCallback(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	front := strings.TrimRight(h.Cfg.FrontendURL, "/")

	code := strings.TrimSpace(r.URL.Query().Get("code"))
	if code == "" {
		http.Redirect(w, r, front+"/login?error=oauth_failed", http.StatusFound)
		return
	}

	info, err := h.Google.ExchangeWeb(ctx, code) // returns *googleUserInfo
	if err != nil || info == nil {
		fmt.Println("Google ExchangeWeb Error:", err)
		http.Redirect(w, r, front+"/login?error=oauth_failed", http.StatusFound)
		return
	}

	// User
	var user userDTO
	err = h.Pure.Post(ctx, "/api/internal/find-user", map[string]any{"email": info.Email}, &user)
	userExists := err == nil && user.ID != 0

	isProfileIncomplete := true
	if userExists {
		// User
		isProfileIncomplete = user.Tel == nil || strings.TrimSpace(*user.Tel) == ""
	}

	// User -> Complete Profile
	if !userExists || isProfileIncomplete {
		redirectURL := fmt.Sprintf("%s/complete-profile?email=%s&name=%s&oauthId=%s&pictureUrl=%s",
			front,
			url.QueryEscape(info.Email),
			url.QueryEscape(info.Name),
			url.QueryEscape(info.ID),
			url.QueryEscape(info.Picture),
		)
		http.Redirect(w, r, redirectURL, http.StatusFound)
		return
	}

	// Random UserID Object Token
	var randomUserID string
	if user.UserID != nil {
		randomUserID = *user.UserID
	} else {
		randomUserID = fmt.Sprintf("%v", user.ID)
	}

	// แปลงสิทธิ์และอัปเดตลงฐานข้อมูล
	user.Role = h.syncUserRole(ctx, randomUserID, user.Role)

	token, err := h.signToken(user.ID, randomUserID, user.Role)
	if err != nil {
		http.Redirect(w, r, front+"/login?error=oauth_failed", http.StatusFound)
		return
	}

	h.setAuthCookie(w, token, true)

	frag := "token=" + url.QueryEscape(token) + "&role=" + url.QueryEscape(user.Role)
	if user.Role == "admin" {
		http.Redirect(w, r, front+"/admin#"+frag, http.StatusFound)
		return
	}
	http.Redirect(w, r, front+"/home#"+frag, http.StatusFound)
}

// GET /api/auth/google-mobile
func (h *Handler) AuthGoogleMobileStart(w http.ResponseWriter, r *http.Request) {
	u, ok := h.Google.AuthURL("state")
	if !ok {
		h.writeError(w, http.StatusServiceUnavailable, "Google login is temporarily unavailable. Please try again in a moment.")
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"ok": true, "url": u})
}

type googleMobileReq struct {
	AuthCode string `json:"authCode"`
}

// POST /api/auth/google-mobile
func (h *Handler) AuthGoogleMobileCallback(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var req googleMobileReq
	if err := ReadJSON(r, &req); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}
	if req.AuthCode == "" {
		h.writeError(w, http.StatusBadRequest, "Missing authCode")
		return
	}

	info, err := h.Google.ExchangeMobile(ctx, req.AuthCode)
	if err != nil || info == nil {
		h.writeError(w, http.StatusUnauthorized, "Invalid Google auth")
		return
	}

	var user userDTO
	err = h.Pure.Post(ctx, "/api/internal/find-user", map[string]any{"email": info.Email}, &user)
	userExists := err == nil && user.ID != 0

	isProfileIncomplete := true
	if userExists {
		isProfileIncomplete = user.Tel == nil || strings.TrimSpace(*user.Tel) == ""
	}

	if !userExists || isProfileIncomplete {
		// Mobile App Complete Profile (JWT token)
		WriteJSON(w, http.StatusOK, map[string]any{
			"isProfileIncomplete": true,
			"needCompleteProfile": true,
			"googleInfo": map[string]any{
				"email":      info.Email,
				"name":       info.Name,
				"oauthId":    info.ID,
				"pictureUrl": info.Picture,
			},
		})
		return
	}

	// Random UserID Object Token
	var randomUserID string
	if user.UserID != nil {
		randomUserID = *user.UserID
	} else {
		randomUserID = fmt.Sprintf("%v", user.ID)
	}

	// แปลงสิทธิ์และอัปเดตลงฐานข้อมูล
	user.Role = h.syncUserRole(ctx, randomUserID, user.Role)

	token, err := h.signToken(user.ID, randomUserID, user.Role)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Token error")
		return
	}

	h.setAuthCookie(w, token, true)
	WriteJSON(w, http.StatusOK, map[string]any{
		"token": token,
		"role":  user.Role,
		"isProfileIncomplete": false,
		"user": map[string]any{
			"id":                  user.ID,
			"email":               user.Email,
			"username":            user.Username,
			"name":                info.Name,
			"role":                user.Role,
			"profile_picture_url": user.ProfilePictureURL,
		},
	})
}