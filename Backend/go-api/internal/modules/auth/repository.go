package auth

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"elmansheya/go-api/internal/platform/database"
)

type Repository interface {
	FindByPhone(ctx context.Context, phone string) (*StoredAccount, error)
	FindByID(ctx context.Context, userID string) (*StoredAccount, error)
	FindByDevice(ctx context.Context, deviceFingerprint string) (*StoredAccount, error)
	CreateAccount(ctx context.Context, acc *StoredAccount) error
	BindDevice(ctx context.Context, userID string, deviceFingerprint string) error
	UpdatePassword(ctx context.Context, phone string, newHash string) error
	CreateSession(ctx context.Context, sess *StoredSession) error
	FindSessionByRefreshHash(ctx context.Context, tokenHash string) (*StoredSession, error)
	RotateSessionRefreshHash(ctx context.Context, sessionID string, newHash string) error
	RevokeSession(ctx context.Context, sessionID string) error
}

type persistedAuthData struct {
	Accounts     map[string]*StoredAccount `json:"accounts"`
	ByID         map[string]*StoredAccount `json:"by_id"`
	Sessions     map[string]*StoredSession `json:"sessions"`
	DeviceToUser map[string]string         `json:"device_to_user"`
}

type diskRepository struct {
	mu    sync.RWMutex
	store *database.PersistentFileStore
	data  persistedAuthData
}

func NewRepository() Repository {
	repo := &diskRepository{
		store: database.NewPersistentFileStore("auth_accounts.json"),
		data: persistedAuthData{
			Accounts:     make(map[string]*StoredAccount),
			ByID:         make(map[string]*StoredAccount),
			Sessions:     make(map[string]*StoredSession),
			DeviceToUser: make(map[string]string),
		},
	}
	_ = repo.store.Load(&repo.data)
	if repo.data.Accounts == nil {
		repo.data.Accounts = make(map[string]*StoredAccount)
	}
	if repo.data.ByID == nil {
		repo.data.ByID = make(map[string]*StoredAccount)
	}
	if repo.data.Sessions == nil {
		repo.data.Sessions = make(map[string]*StoredSession)
	}
	if repo.data.DeviceToUser == nil {
		repo.data.DeviceToUser = make(map[string]string)
	}
	return repo
}

func (r *diskRepository) FindByPhone(ctx context.Context, phone string) (*StoredAccount, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	clean := strings.TrimSpace(phone)
	acc, ok := r.data.Accounts[clean]
	if !ok {
		if strings.HasPrefix(clean, "0") {
			acc, ok = r.data.Accounts[strings.TrimPrefix(clean, "0")]
		} else {
			acc, ok = r.data.Accounts["0"+clean]
		}
	}
	if !ok {
		return nil, errors.New("not found")
	}
	copyAcc := *acc
	return &copyAcc, nil
}

func (r *diskRepository) FindByID(ctx context.Context, userID string) (*StoredAccount, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	acc, ok := r.data.ByID[userID]
	if !ok {
		return nil, errors.New("not found")
	}
	copyAcc := *acc
	return &copyAcc, nil
}

func (r *diskRepository) FindByDevice(ctx context.Context, deviceFingerprint string) (*StoredAccount, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	clean := strings.TrimSpace(deviceFingerprint)
	if clean == "" {
		return nil, errors.New("empty device fingerprint")
	}
	uid, ok := r.data.DeviceToUser[clean]
	if !ok {
		return nil, errors.New("device not bound")
	}
	acc, ok := r.data.ByID[uid]
	if !ok {
		return nil, errors.New("account not found")
	}
	copyAcc := *acc
	return &copyAcc, nil
}

func (r *diskRepository) CreateAccount(ctx context.Context, acc *StoredAccount) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, exists := r.data.Accounts[acc.Phone]; exists {
		return errors.New("exists")
	}

	cleanFP := strings.TrimSpace(acc.BoundDeviceFingerprint)
	if cleanFP != "" {
		if existingUID, exists := r.data.DeviceToUser[cleanFP]; exists && existingUID != "" {
			return errors.New("device_already_bound")
		}
	}

	acc.ID = fmt.Sprintf("usr-%d", time.Now().UnixNano())
	acc.CreatedAt = time.Now()
	r.data.Accounts[acc.Phone] = acc
	r.data.ByID[acc.ID] = acc
	if cleanFP != "" {
		r.data.DeviceToUser[cleanFP] = acc.ID
	}
	return r.store.Save(&r.data)
}

func (r *diskRepository) BindDevice(ctx context.Context, userID string, deviceFingerprint string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	cleanFP := strings.TrimSpace(deviceFingerprint)
	if cleanFP == "" {
		return nil
	}
	if existingUID, exists := r.data.DeviceToUser[cleanFP]; exists && existingUID != userID {
		return errors.New("device_already_bound")
	}
	r.data.DeviceToUser[cleanFP] = userID
	if acc, ok := r.data.ByID[userID]; ok {
		acc.BoundDeviceFingerprint = cleanFP
	}
	return r.store.Save(&r.data)
}

func (r *diskRepository) CreateSession(ctx context.Context, sess *StoredSession) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.data.Sessions[sess.SessionID] = sess
	return r.store.Save(&r.data)
}

func (r *diskRepository) FindSessionByRefreshHash(ctx context.Context, tokenHash string) (*StoredSession, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, s := range r.data.Sessions {
		if s.RefreshTokenHash == tokenHash && !s.Revoked && time.Now().Before(s.ExpiresAt) {
			copySess := *s
			return &copySess, nil
		}
	}
	return nil, errors.New("session not found or revoked")
}

func (r *diskRepository) RotateSessionRefreshHash(ctx context.Context, sessionID string, newHash string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	sess, ok := r.data.Sessions[sessionID]
	if !ok || sess.Revoked {
		return errors.New("session invalid")
	}
	sess.RefreshTokenHash = newHash
	sess.ExpiresAt = time.Now().Add(7 * 24 * time.Hour)
	return r.store.Save(&r.data)
}

func (r *diskRepository) RevokeSession(ctx context.Context, sessionID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if sess, ok := r.data.Sessions[sessionID]; ok {
		sess.Revoked = true
		return r.store.Save(&r.data)
	}
	return nil
}

func (r *diskRepository) UpdatePassword(ctx context.Context, phone string, newHash string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	clean := strings.TrimSpace(phone)
	acc, ok := r.data.Accounts[clean]
	if !ok {
		if strings.HasPrefix(clean, "0") {
			acc, ok = r.data.Accounts[strings.TrimPrefix(clean, "0")]
		} else {
			acc, ok = r.data.Accounts["0"+clean]
		}
	}
	if !ok {
		return errors.New("account not found")
	}
	acc.PasswordHash = newHash
	if byIdAcc, exists := r.data.ByID[acc.ID]; exists {
		byIdAcc.PasswordHash = newHash
	}
	return r.store.Save(&r.data)
}
