package auth

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"elmansheya/go-api/internal/platform/security"
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Login(ctx context.Context, req LoginRequestDTO) (*AuthTokensResponseDTO, string, error) {
	phone := strings.TrimSpace(req.Phone)
	acc, err := s.repo.FindByPhone(ctx, phone)
	if err != nil || !security.VerifyPassword(req.Password, acc.PasswordHash) {
		return nil, ErrCodeInvalidCredentials, errors.New(ErrMsgInvalidCredentialsAr)
	}

	cleanFP := strings.TrimSpace(req.DeviceFingerprint)
	if cleanFP != "" {
		// إذا كان هذا الهاتف مرتبطاً بالفعل بحساب مواطن آخر، نمنع تسجيل الدخول العشوائي
		if boundAcc, bErr := s.repo.FindByDevice(ctx, cleanFP); bErr == nil && boundAcc != nil && boundAcc.ID != acc.ID {
			return nil, ErrCodeDeviceMismatch, errors.New(ErrMsgDeviceMismatchAr)
		}
		// تثبيت البصمة على الحساب
		_ = s.repo.BindDevice(ctx, acc.ID, cleanFP)
		acc.BoundDeviceFingerprint = cleanFP
	}

	return s.issueSessionTokens(ctx, acc, req.EnableBiometric || acc.BiometricEnabled)
}

func (s *Service) Register(ctx context.Context, req RegisterRequestDTO) (*AuthTokensResponseDTO, string, error) {
	phone := strings.TrimSpace(req.Phone)
	if phone == "" || strings.TrimSpace(req.FullName) == "" {
		return nil, ErrCodeInvalidCredentials, errors.New("الاسم ورقم الهاتف مطلوبان.")
	}

	hash, err := security.HashPassword(req.Password)
	if err != nil {
		return nil, ErrCodeInvalidCredentials, err
	}

	cleanFP := strings.TrimSpace(req.DeviceFingerprint)
	acc := &StoredAccount{
		FullName:               strings.TrimSpace(req.FullName),
		Phone:                  phone,
		PasswordHash:           hash,
		Area:                   strings.TrimSpace(req.Area),
		Role:                   "citizen",
		RoleNameAr:             "المواطن",
		VerificationStatus:     "unverified",
		BiometricEnabled:       false,
		BoundDeviceFingerprint: cleanFP,
	}

	if err := s.repo.CreateAccount(ctx, acc); err != nil {
		if err.Error() == "device_already_bound" {
			return nil, ErrCodeDeviceAlreadyBound, errors.New(ErrMsgDeviceAlreadyBoundAr)
		}
		return nil, ErrCodePhoneAlreadyExists, errors.New(ErrMsgPhoneAlreadyExistsAr)
	}

	return s.issueSessionTokens(ctx, acc, false)
}

// Refresh rotates the refresh token and issues a new short-lived access token (البند 15)
func (s *Service) Refresh(ctx context.Context, rawRefreshToken string) (*AuthTokensResponseDTO, string, error) {
	hash := security.HashRefreshToken(strings.TrimSpace(rawRefreshToken))
	sess, err := s.repo.FindSessionByRefreshHash(ctx, hash)
	if err != nil {
		return nil, ErrCodeSessionRevoked, errors.New(ErrMsgSessionRevokedAr)
	}

	acc, err := s.repo.FindByID(ctx, sess.UserID)
	if err != nil {
		return nil, ErrCodeSessionRevoked, errors.New(ErrMsgSessionRevokedAr)
	}

	newRawRefresh, newRefreshHash, err := security.GenerateRefreshToken()
	if err != nil {
		return nil, ErrCodeAuthUnavailable, errors.New(ErrMsgAuthUnavailableAr)
	}

	if err := s.repo.RotateSessionRefreshHash(ctx, sess.SessionID, newRefreshHash); err != nil {
		return nil, ErrCodeSessionRevoked, errors.New(ErrMsgSessionRevokedAr)
	}

	accessTTL := 15 * time.Minute
	accessToken, err := security.GenerateAccessToken(acc.ID, acc.Phone, acc.Role, sess.SessionID, accessTTL)
	if err != nil {
		return nil, ErrCodeAuthUnavailable, errors.New(ErrMsgAuthUnavailableAr)
	}

	return &AuthTokensResponseDTO{
		AccessToken:  accessToken,
		RefreshToken: newRawRefresh,
		ExpiresInSec: int(accessTTL.Seconds()),
		SessionID:    sess.SessionID,
		User:         mapAccountToDTO(acc),
	}, "", nil
}

// BiometricUnlock يسمح بالدخول بالبصمة أو الوجه لجلسة محفوظة على الجهاز بعد تفعيل الميزة (البند 7.2 و 7.10)
func (s *Service) BiometricUnlock(ctx context.Context, req BiometricLoginRequestDTO) (*AuthTokensResponseDTO, string, error) {
	hash := security.HashRefreshToken(strings.TrimSpace(req.RefreshToken))
	sess, err := s.repo.FindSessionByRefreshHash(ctx, hash)
	if err != nil || !sess.BiometricBound {
		return nil, ErrCodeBiometricNotBound, errors.New(ErrMsgBiometricNotBoundAr)
	}
	return s.Refresh(ctx, req.RefreshToken)
}

func (s *Service) Logout(ctx context.Context, sessionID string) error {
	return s.repo.RevokeSession(ctx, sessionID)
}

func (s *Service) issueSessionTokens(ctx context.Context, acc *StoredAccount, biometricBound bool) (*AuthTokensResponseDTO, string, error) {
	rawRefresh, refreshHash, err := security.GenerateRefreshToken()
	if err != nil {
		return nil, ErrCodeAuthUnavailable, errors.New(ErrMsgAuthUnavailableAr)
	}

	sessionID := fmt.Sprintf("sess-%s-%d", acc.ID, time.Now().UnixNano())
	sess := &StoredSession{
		SessionID:        sessionID,
		UserID:           acc.ID,
		RefreshTokenHash: refreshHash,
		BiometricBound:   biometricBound,
		Revoked:          false,
		ExpiresAt:        time.Now().Add(7 * 24 * time.Hour),
	}

	if err := s.repo.CreateSession(ctx, sess); err != nil {
		return nil, ErrCodeAuthUnavailable, errors.New(ErrMsgAuthUnavailableAr)
	}

	accessTTL := 15 * time.Minute
	accessToken, err := security.GenerateAccessToken(acc.ID, acc.Phone, acc.Role, sessionID, accessTTL)
	if err != nil {
		return nil, ErrCodeAuthUnavailable, errors.New(ErrMsgAuthUnavailableAr)
	}

	return &AuthTokensResponseDTO{
		AccessToken:  accessToken,
		RefreshToken: rawRefresh,
		ExpiresInSec: int(accessTTL.Seconds()),
		SessionID:    sessionID,
		User:         mapAccountToDTO(acc),
	}, "", nil
}

func (s *Service) ChangePassword(ctx context.Context, phone string, newPassword string) (string, error) {
	cleanPass := strings.TrimSpace(newPassword)
	if len(cleanPass) < 6 {
		return ErrCodeInvalidCredentials, errors.New("يجب ألا تقل كلمة السر عن ٦ أحرف أو أرقام.")
	}
	hash, err := security.HashPassword(cleanPass)
	if err != nil {
		return ErrCodeInvalidCredentials, err
	}
	if err := s.repo.UpdatePassword(ctx, phone, hash); err != nil {
		return ErrCodeInvalidCredentials, errors.New("تعذر العثور على الحساب لتحديث كلمة السر.")
	}
	return "", nil
}

func (s *Service) GetAccountByDevice(ctx context.Context, deviceFP string) (*StoredAccount, error) {
	return s.repo.FindByDevice(ctx, deviceFP)
}

func mapAccountToDTO(acc *StoredAccount) AuthUserDTO {
	return AuthUserDTO{
		ID:                     acc.ID,
		FullName:               acc.FullName,
		Phone:                  acc.Phone,
		Area:                   acc.Area,
		Role:                   acc.Role,
		RoleNameAr:             acc.RoleNameAr,
		VerificationStatus:     acc.VerificationStatus,
		BiometricEnabled:       acc.BiometricEnabled,
		BoundDeviceFingerprint: acc.BoundDeviceFingerprint,
	}
}
