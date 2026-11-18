package gdrive

import (
	"bytes"
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

const DriveRootFolder = "Elmansheya"

var AllSectionFolders = []string{
	"الأخبار_والتغطيات",
	"البلاغات_والشكاوى",
	"الصنايعية_والحرفيين",
	"الخدمات_والمرافق",
	"المناسبات_والعزاء",
	"الحالات_الإنسانية",
	"الصحة_والطوارئ",
	"الملفات_الشخصية",
}

var MediaSubfolders = []string{"صور", "فيديوهات"}

type ServiceAccountKey struct {
	Type        string `json:"type"`
	ProjectID   string `json:"project_id"`
	PrivateKey  string `json:"private_key"`
	ClientEmail string `json:"client_email"`
	TokenURI    string `json:"token_uri"`
}

type DriveOAuthCredentials struct {
	ClientID     string `json:"client_id"`
	ClientSecret string `json:"client_secret"`
	RefreshToken string `json:"refresh_token"`
}

type Client struct {
	mu           sync.RWMutex
	saKey        *ServiceAccountKey
	rsaKey       *rsa.PrivateKey
	oauthCreds   *DriveOAuthCredentials
	rclonePath   string
	rcloneRemote string
	accessToken  string
	tokenExpires time.Time
	folderCache  map[string]string // مسار المجلد -> معرف المجلد على درايف
}

func NewClient() *Client {
	c := &Client{
		folderCache: make(map[string]string),
	}
	_ = c.loadCredentials()
	return c
}

// IsConfigured يفحص هل تم ربط حساب Google Drive بالمنظومة
func (c *Client) IsConfigured() bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.rcloneRemote != "" || c.saKey != nil || (c.oauthCreds != nil && c.oauthCreds.RefreshToken != "")
}

// ReloadCredentials يعيد تحميل المفاتيح من القرص بعد تحديثها
func (c *Client) ReloadCredentials() error {
	return c.loadCredentials()
}

// GetClientEmail يعيد البريد الإلكتروني لحساب الخدمة السحابي إن وجد
func (c *Client) GetClientEmail() string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	if c.saKey != nil {
		return c.saKey.ClientEmail
	}
	return ""
}

// GetRcloneRemote يعيد اسم الريموت المفعل في أداة Rclone
func (c *Client) GetRcloneRemote() string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.rcloneRemote
}

func (c *Client) detectRclone() {
	candidates := []string{
		filepath.Join("tools", "rclone.exe"),
		filepath.Join("..", "tools", "rclone.exe"),
		filepath.Join("Backend", "go-api", "tools", "rclone.exe"),
		filepath.Join("tools", "rclone"),
		"/usr/bin/rclone",
		"/usr/local/bin/rclone",
		"rclone.exe",
		"rclone",
	}

	c.rclonePath = ""
	c.rcloneRemote = ""
	for _, p := range candidates {
		if _, err := os.Stat(p); err == nil {
			c.rclonePath = p
			break
		}
		if lp, err := exec.LookPath(p); err == nil {
			c.rclonePath = lp
			break
		}
	}

	if c.rclonePath == "" {
		return
	}

	// فحص قائمة الريموتات المسجلة في Rclone
	cmd := exec.Command(c.rclonePath, "listremotes")
	out, err := cmd.Output()
	if err == nil {
		lines := strings.Split(string(out), "\n")
		for _, l := range lines {
			trimmed := strings.TrimSpace(l)
			if trimmed != "" {
				name := strings.TrimSuffix(trimmed, ":")
				// التحقق من أن الريموت يحتوي على توكن متصل وسليم
				chkCmd := exec.Command(c.rclonePath, "lsd", name+":", "--max-depth", "1")
				if chkErr := chkCmd.Run(); chkErr == nil {
					c.rcloneRemote = name
					break
				}
			}
		}
	}
}

func (c *Client) loadCredentials() error {
	c.mu.Lock()
	defer c.mu.Unlock()

	// 0. التحقق من أداة Rclone
	c.detectRclone()

	// 1. محاولة تحميل ملف Service Account JSON (الخيار الموصى به)
	saPath := filepath.Join("data", "google_drive_credentials.json")
	if data, err := os.ReadFile(saPath); err == nil {
		var sa ServiceAccountKey
		if err := json.Unmarshal(data, &sa); err == nil && sa.PrivateKey != "" {
			block, _ := pem.Decode([]byte(sa.PrivateKey))
			if block != nil {
				parsedKey, err := x509.ParsePKCS8PrivateKey(block.Bytes)
				if err == nil {
					if rsaPriv, ok := parsedKey.(*rsa.PrivateKey); ok {
						c.saKey = &sa
						c.rsaKey = rsaPriv
						return nil
					}
				}
			}
		}
	}

	// 2. محاولة تحميل إعدادات OAuth2 (Client ID + Secret + Refresh Token)
	oauthPath := filepath.Join("data", "google_drive_oauth.json")
	if data, err := os.ReadFile(oauthPath); err == nil {
		var creds DriveOAuthCredentials
		if err := json.Unmarshal(data, &creds); err == nil && creds.RefreshToken != "" {
			c.oauthCreds = &creds
			return nil
		}
	}

	if c.rcloneRemote != "" {
		return nil
	}

	return errors.New("لم يتم العثور على ملفات ربط Google Drive")
}

func (c *Client) getAccessToken() (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.accessToken != "" && time.Now().Before(c.tokenExpires.Add(-2*time.Minute)) {
		return c.accessToken, nil
	}

	// أ. المصادقة عبر Service Account
	if c.saKey != nil && c.rsaKey != nil {
		token, expiry, err := c.fetchServiceAccountToken()
		if err != nil {
			return "", err
		}
		c.accessToken = token
		c.tokenExpires = expiry
		return token, nil
	}

	// ب. المصادقة عبر OAuth Refresh Token
	if c.oauthCreds != nil && c.oauthCreds.RefreshToken != "" {
		token, expiry, err := c.fetchOAuthRefreshToken()
		if err != nil {
			return "", err
		}
		c.accessToken = token
		c.tokenExpires = expiry
		return token, nil
	}

	return "", errors.New("حساب Google Drive غير مربوط بعد")
}

func (c *Client) fetchServiceAccountToken() (string, time.Time, error) {
	now := time.Now()
	tokenURI := c.saKey.TokenURI
	if tokenURI == "" {
		tokenURI = "https://oauth2.googleapis.com/token"
	}

	headerJSON := `{"alg":"RS256","typ":"JWT"}`
	claimsJSON := fmt.Sprintf(
		`{"iss":"%s","scope":"https://www.googleapis.com/auth/drive","aud":"%s","exp":%d,"iat":%d}`,
		c.saKey.ClientEmail,
		tokenURI,
		now.Add(time.Hour).Unix(),
		now.Unix(),
	)

	h64 := base64.RawURLEncoding.EncodeToString([]byte(headerJSON))
	c64 := base64.RawURLEncoding.EncodeToString([]byte(claimsJSON))
	signingInput := h64 + "." + c64

	hashed := sha256.Sum256([]byte(signingInput))
	sig, err := rsa.SignPKCS1v15(rand.Reader, c.rsaKey, crypto.SHA256, hashed[:])
	if err != nil {
		return "", time.Time{}, err
	}

	assertion := signingInput + "." + base64.RawURLEncoding.EncodeToString(sig)

	v := url.Values{}
	v.Set("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer")
	v.Set("assertion", assertion)

	resp, err := http.PostForm(tokenURI, v)
	if err != nil {
		return "", time.Time{}, err
	}
	defer resp.Body.Close()

	var tokenRes struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
		Error       string `json:"error"`
		ErrorDesc   string `json:"error_description"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&tokenRes); err != nil {
		return "", time.Time{}, err
	}
	if tokenRes.Error != "" {
		return "", time.Time{}, fmt.Errorf("خطأ Google OAuth: %s (%s)", tokenRes.Error, tokenRes.ErrorDesc)
	}

	return tokenRes.AccessToken, now.Add(time.Duration(tokenRes.ExpiresIn) * time.Second), nil
}

func (c *Client) fetchOAuthRefreshToken() (string, time.Time, error) {
	now := time.Now()
	v := url.Values{}
	v.Set("client_id", c.oauthCreds.ClientID)
	v.Set("client_secret", c.oauthCreds.ClientSecret)
	v.Set("refresh_token", c.oauthCreds.RefreshToken)
	v.Set("grant_type", "refresh_token")

	resp, err := http.PostForm("https://oauth2.googleapis.com/token", v)
	if err != nil {
		return "", time.Time{}, err
	}
	defer resp.Body.Close()

	var tokenRes struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
		Error       string `json:"error"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&tokenRes); err != nil {
		return "", time.Time{}, err
	}
	if tokenRes.Error != "" {
		return "", time.Time{}, fmt.Errorf("خطأ Refresh Token: %s", tokenRes.Error)
	}

	return tokenRes.AccessToken, now.Add(time.Duration(tokenRes.ExpiresIn) * time.Second), nil
}

// GetOrCreateFolder ينشئ مجلداً على Google Drive إذا لم يكن موجوداً
func (c *Client) GetOrCreateFolder(folderName string, parentID string) (string, error) {
	cacheKey := parentID + "/" + folderName
	c.mu.RLock()
	cachedID, ok := c.folderCache[cacheKey]
	c.mu.RUnlock()
	if ok && cachedID != "" {
		return cachedID, nil
	}

	token, err := c.getAccessToken()
	if err != nil {
		return "", err
	}

	// 1. البحث عن المجلد
	query := fmt.Sprintf("name = '%s' and mimeType = 'application/vnd.google-apps.folder' and trashed = false", folderName)
	if parentID != "" {
		query += fmt.Sprintf(" and '%s' in parents", parentID)
	}

	searchURL := fmt.Sprintf("https://www.googleapis.com/drive/v3/files?q=%s&fields=files(id,name)", url.QueryEscape(query))
	req, _ := http.NewRequest("GET", searchURL, nil)
	req.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err == nil {
		defer resp.Body.Close()
		var searchRes struct {
			Files []struct {
				ID   string `json:"id"`
				Name string `json:"name"`
			} `json:"files"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&searchRes); err == nil && len(searchRes.Files) > 0 {
			folderID := searchRes.Files[0].ID
			c.mu.Lock()
			c.folderCache[cacheKey] = folderID
			c.mu.Unlock()
			return folderID, nil
		}
	}

	// 2. إذا لم يكن موجوداً، نقوم بإنشائه
	type folderMeta struct {
		Name     string   `json:"name"`
		MimeType string   `json:"mimeType"`
		Parents  []string `json:"parents,omitempty"`
	}

	meta := folderMeta{
		Name:     folderName,
		MimeType: "application/vnd.google-apps.folder",
	}
	if parentID != "" {
		meta.Parents = []string{parentID}
	}

	metaBytes, _ := json.Marshal(meta)
	createReq, _ := http.NewRequest("POST", "https://www.googleapis.com/drive/v3/files", bytes.NewReader(metaBytes))
	createReq.Header.Set("Authorization", "Bearer "+token)
	createReq.Header.Set("Content-Type", "application/json")

	createResp, err := client.Do(createReq)
	if err != nil {
		return "", err
	}
	defer createResp.Body.Close()

	var created struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(createResp.Body).Decode(&created); err != nil || created.ID == "" {
		return "", errors.New("تعذر إنشاء مجلد Google Drive")
	}

	c.mu.Lock()
	c.folderCache[cacheKey] = created.ID
	c.mu.Unlock()

	return created.ID, nil
}

// EnsureFolderStructure ينشئ شجرة مجلدات Elmansheya وجميع الأقسام ومجلدي صور وفيديوهات على Google Drive
func (c *Client) EnsureFolderStructure() error {
	c.mu.RLock()
	remote := c.rcloneRemote
	rcloneExe := c.rclonePath
	c.mu.RUnlock()

	if remote != "" && rcloneExe != "" {
		if out, err := exec.Command(rcloneExe, "mkdir", fmt.Sprintf("%s:%s", remote, DriveRootFolder)).CombinedOutput(); err != nil {
			return fmt.Errorf("فشل إنشاء مجلد %s: %v (%s)", DriveRootFolder, err, string(out))
		}
		for _, sec := range AllSectionFolders {
			for _, sub := range MediaSubfolders {
				target := fmt.Sprintf("%s:%s/%s/%s", remote, DriveRootFolder, sec, sub)
				if out, err := exec.Command(rcloneExe, "mkdir", target).CombinedOutput(); err != nil {
					return fmt.Errorf("فشل إنشاء مجلد %s: %v (%s)", target, err, string(out))
				}
			}
		}
		return nil
	}

	rootID, err := c.GetOrCreateFolder(DriveRootFolder, "")
	if err != nil {
		return err
	}
	for _, sec := range AllSectionFolders {
		secID, err := c.GetOrCreateFolder(sec, rootID)
		if err != nil {
			return err
		}
		for _, sub := range MediaSubfolders {
			if _, err := c.GetOrCreateFolder(sub, secID); err != nil {
				return err
			}
		}
	}
	return nil
}

// UploadDirectToDrive يرفع الملف مباشرة على Google Drive ويجعله عاماً للقراءة ويولد رابط البث فائق السرعة
func (c *Client) UploadDirectToDrive(
	sectionFolder string,
	mediaFolder string,
	filename string,
	fileData []byte,
	mimeType string,
) (directURL string, fileID string, err error) {
	// ١. إذا كانت أداة Rclone هي المهيأة (أداة المستخدم المفضلة)
	c.mu.RLock()
	remote := c.rcloneRemote
	rcloneExe := c.rclonePath
	c.mu.RUnlock()

	if remote != "" && rcloneExe != "" {
		return c.uploadViaRclone(sectionFolder, mediaFolder, filename, fileData, mimeType)
	}

	// ٢. المصادقة المباشرة عبر Service Account أو OAuth
	token, err := c.getAccessToken()
	if err != nil {
		return "", "", err
	}

	// 1. ضمان وجود شجرة المجلدات: Elmansheya -> القسم -> نوع الميديا
	rootID, err := c.GetOrCreateFolder(DriveRootFolder, "")
	if err != nil {
		return "", "", err
	}
	sectionID, err := c.GetOrCreateFolder(sectionFolder, rootID)
	if err != nil {
		return "", "", err
	}
	targetFolderID, err := c.GetOrCreateFolder(mediaFolder, sectionID)
	if err != nil {
		return "", "", err
	}

	// 2. رفع الملف عبر Multipart Upload
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)

	// الجزء الأول: Metadata
	metaPartHeader := make(textproto.MIMEHeader)
	metaPartHeader.Set("Content-Type", "application/json; charset=UTF-8")
	metaPart, _ := writer.CreatePart(metaPartHeader)

	type fileMeta struct {
		Name    string   `json:"name"`
		Parents []string `json:"parents"`
	}
	metaData, _ := json.Marshal(fileMeta{
		Name:    filename,
		Parents: []string{targetFolderID},
	})
	metaPart.Write(metaData)

	// الجزء الثاني: Media
	mediaPartHeader := make(textproto.MIMEHeader)
	mediaPartHeader.Set("Content-Type", mimeType)
	mediaPart, _ := writer.CreatePart(mediaPartHeader)
	mediaPart.Write(fileData)

	writer.Close()

	uploadURL := "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink"
	upReq, _ := http.NewRequest("POST", uploadURL, &body)
	upReq.Header.Set("Authorization", "Bearer "+token)
	upReq.Header.Set("Content-Type", fmt.Sprintf("multipart/related; boundary=%s", writer.Boundary()))

	httpClient := &http.Client{Timeout: 60 * time.Second}
	upResp, err := httpClient.Do(upReq)
	if err != nil {
		return "", "", err
	}
	defer upResp.Body.Close()

	if upResp.StatusCode >= 400 {
		respBody, _ := io.ReadAll(upResp.Body)
		return "", "", fmt.Errorf("خطأ رفع درايف (%d): %s", upResp.StatusCode, string(respBody))
	}

	var uploadResult struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(upResp.Body).Decode(&uploadResult); err != nil || uploadResult.ID == "" {
		return "", "", errors.New("تعذر استخراج معرف الملف من Google Drive")
	}

	fileID = uploadResult.ID

	// 3. جعل الملف قابلاً للعرض العام (anyone: reader)
	permBody := []byte(`{"role":"reader","type":"anyone"}`)
	permReq, _ := http.NewRequest("POST", fmt.Sprintf("https://www.googleapis.com/drive/v3/files/%s/permissions", fileID), bytes.NewReader(permBody))
	permReq.Header.Set("Authorization", "Bearer "+token)
	permReq.Header.Set("Content-Type", "application/json")
	permResp, permErr := httpClient.Do(permReq)
	if permErr == nil {
		permResp.Body.Close()
	}

	// 4. توليد رابط البث فائق السرعة عبر شبكة Google CDN العالمية
	if strings.HasPrefix(mimeType, "video/") || strings.HasSuffix(filename, ".mp4") {
		directURL = fmt.Sprintf("https://drive.google.com/file/d/%s/preview", fileID)
	} else {
		directURL = fmt.Sprintf("https://lh3.googleusercontent.com/d/%s", fileID)
	}

	return directURL, fileID, nil
}

// uploadViaRclone ينفذ عملية الرفع السحابي عبر Rclone CLI بسرعة فائقة وحذف فوري للملف المؤقت
func (c *Client) uploadViaRclone(
	sectionFolder string,
	mediaFolder string,
	filename string,
	fileData []byte,
	mimeType string,
) (directURL string, fileID string, err error) {
	ext := filepath.Ext(filename)
	tmpFile, err := os.CreateTemp("", "elmansheya_upload_*"+ext)
	if err != nil {
		return "", "", fmt.Errorf("تعذر إنشاء ملف مؤقت للرفع: %w", err)
	}
	tempPath := tmpFile.Name()
	if _, writeErr := tmpFile.Write(fileData); writeErr != nil {
		_ = tmpFile.Close()
		_ = os.Remove(tempPath)
		return "", "", fmt.Errorf("تعذر كتابة الملف المؤقت للرفع: %w", writeErr)
	}
	_ = tmpFile.Close()
	defer os.Remove(tempPath) // حذف الملف المؤقت فور انتهاء الرفع (0 بايت على السيرفر)

	targetDrivePath := fmt.Sprintf("%s:%s/%s/%s/%s", c.rcloneRemote, DriveRootFolder, sectionFolder, mediaFolder, filename)

	// أ. رفع الملف إلى المجلد السحابي المحدد على حساب الـ 5 تيرا
	cmdCopy := exec.Command(c.rclonePath, "copyto", tempPath, targetDrivePath)
	if out, err := cmdCopy.CombinedOutput(); err != nil {
		return "", "", fmt.Errorf("فشل الرفع عبر Rclone: %v (%s)", err, string(out))
	}

	// ب. استخراج معرف الملف على جوجل درايف (File ID)
	cmdID := exec.Command(c.rclonePath, "lsf", "--format", "i", targetDrivePath)
	outID, _ := cmdID.Output()
	fileID = strings.TrimSpace(string(outID))

	// ج. تفعيل رابط المشاركة العام للملف
	cmdLink := exec.Command(c.rclonePath, "link", targetDrivePath)
	outLink, _ := cmdLink.Output()
	publicLink := strings.TrimSpace(string(outLink))

	if fileID == "" && publicLink != "" {
		if parsed, parseErr := url.Parse(publicLink); parseErr == nil {
			if idParam := parsed.Query().Get("id"); idParam != "" {
				fileID = idParam
			} else if strings.Contains(parsed.Path, "/file/d/") {
				parts := strings.Split(parsed.Path, "/file/d/")
				if len(parts) > 1 {
					fileID = strings.Split(parts[1], "/")[0]
				}
			}
		}
	}

	// د. توليد رابط الـ CDN المباشر عالي السرعة
	if fileID != "" {
		if strings.HasPrefix(mimeType, "video/") || strings.HasSuffix(filename, ".mp4") {
			directURL = fmt.Sprintf("https://drive.google.com/file/d/%s/preview", fileID)
		} else {
			directURL = fmt.Sprintf("https://lh3.googleusercontent.com/d/%s", fileID)
		}
	} else if publicLink != "" {
		directURL = publicLink
	} else {
		return "", "", errors.New("تم الرفع إلى Google Drive ولكن تعذر استخراج رابط الملف العام")
	}

	return directURL, fileID, nil
}
