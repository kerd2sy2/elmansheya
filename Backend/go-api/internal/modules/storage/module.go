package storage

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"elmansheya/go-api/internal/platform/gdrive"
	"elmansheya/go-api/internal/platform/response"
)

type Module struct {
	baseDir     string
	driveClient *gdrive.Client
}

func NewModule() *Module {
	base := filepath.Join("data", "Elmansheya_App")
	sections := []string{
		"الأخبار_والتغطيات",
		"الخدمات_والمرافق",
		"الصنايعية_والحرفيين",
		"المناسبات_والعزاء",
	}
	subfolders := []string{"صور", "فيديوهات"}

	for _, sec := range sections {
		for _, sub := range subfolders {
			dirPath := filepath.Join(base, sec, sub)
			_ = os.MkdirAll(dirPath, 0755)
		}
	}

	return &Module{
		baseDir:     base,
		driveClient: gdrive.NewClient(),
	}
}

func (m *Module) Name() string    { return "storage" }
func (m *Module) TitleAr() string { return "المستودع السحابي والملفات" }
func (m *Module) Prefix() string  { return "/api/v1/storage" }

func (m *Module) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/upload", m.handleUpload)
	mux.HandleFunc("/structure", m.handleStructure)
	mux.HandleFunc("/drive-status", m.handleDriveStatus)
	mux.HandleFunc("/drive-configure", m.handleDriveConfigure)
	return mux
}

func (m *Module) HealthCheck() error {
	return nil
}

func (m *Module) handleDriveStatus(w http.ResponseWriter, r *http.Request) {
	configured := m.driveClient.IsConfigured()
	clientEmail := m.driveClient.GetClientEmail()
	rcloneRemote := m.driveClient.GetRcloneRemote()

	provider := "none"
	if rcloneRemote != "" {
		provider = fmt.Sprintf("rclone (%s)", rcloneRemote)
	} else if clientEmail != "" {
		provider = fmt.Sprintf("service_account (%s)", clientEmail)
	}

	response.JSON(w, http.StatusOK, "storage", "v1", map[string]interface{}{
		"google_drive_connected": configured,
		"provider":              provider,
		"rclone_remote":         rcloneRemote,
		"client_email":          clientEmail,
		"target_root_folder":    "تطبيق_المنشية",
		"storage_mode": func() string {
			if configured {
				return "direct_google_drive_5tb"
			}
			return "local_ready_for_drive_sync"
		}(),
		"credentials_file_path": "Backend/go-api/data/google_drive_credentials.json",
		"instructions_ar": "تم إعداد أداة Rclone. شغل ملف 'ربط_سحابة_جوجل_درايف_Rclone.bat' للمصادقة بضغطة واحدة بحسابك الـ 5 تيرا.",
	}, nil)
}

func (m *Module) handleDriveConfigure(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		response.ModuleError(w, http.StatusMethodNotAllowed, "storage", "METHOD_NOT_ALLOWED", "الطريقة غير مسموحة")
		return
	}

	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil || len(bodyBytes) == 0 {
		response.ModuleError(w, http.StatusBadRequest, "storage", "EMPTY_BODY", "يرجى إرسال بيانات ملف المفتاح")
		return
	}

	raw := strings.TrimSpace(string(bodyBytes))

	// محاولة استخراج الحقل إذا كان مغلفاً بـ { "credentials_json": "..." }
	var wrapped struct {
		CredentialsJSON string `json:"credentials_json"`
	}
	if err := json.Unmarshal(bodyBytes, &wrapped); err == nil && wrapped.CredentialsJSON != "" {
		raw = strings.TrimSpace(wrapped.CredentialsJSON)
	}

	// التحقق من صحة JSON ومفتاح الـ Service Account
	var testSA gdrive.ServiceAccountKey
	if err := json.Unmarshal([]byte(raw), &testSA); err != nil || testSA.PrivateKey == "" {
		response.ModuleError(w, http.StatusBadRequest, "storage", "INVALID_SA_KEY", "صيغة ملف Google Service Account غير صالحة، يرجى التأكد من نسخ ملف JSON كاملاً")
		return
	}

	// حفظ المفتاح في المسار المعتمد
	saPath := filepath.Join("data", "google_drive_credentials.json")
	if err := os.WriteFile(saPath, []byte(raw), 0600); err != nil {
		response.ModuleError(w, http.StatusInternalServerError, "storage", "WRITE_FAILED", "تعذر حفظ المفتاح في السيرفر")
		return
	}

	if err := m.driveClient.ReloadCredentials(); err != nil {
		_ = os.Remove(saPath)
		response.ModuleError(w, http.StatusBadRequest, "storage", "INIT_FAILED", fmt.Sprintf("فشل تفعيل المفتاح: %v", err))
		return
	}

	// التحقق واختبار الوصول إلى مجلد تطبيق_المنشية على جوجل درايف
	rootID, err := m.driveClient.GetOrCreateFolder("تطبيق_المنشية", "")
	if err != nil {
		response.JSON(w, http.StatusOK, "storage", "v1", map[string]interface{}{
			"success":                 true,
			"google_drive_configured": true,
			"client_email":            testSA.ClientEmail,
			"warning":                 fmt.Sprintf("تم حفظ المفتاح، ولكن تعذر الوصول لمجلد درايف: %v. يرجى التأكد من تفعيل Google Drive API ومشاركة المجلد مع: %s", err, testSA.ClientEmail),
		}, nil)
		return
	}

	response.JSON(w, http.StatusOK, "storage", "v1", map[string]interface{}{
		"success":                 true,
		"google_drive_configured": true,
		"client_email":            testSA.ClientEmail,
		"root_folder_id":          rootID,
		"message":                 "تم ربط حساب Google Drive بنجاح! سيتم حفظ الصور والفيديوهات مباشرة على سحابتك الـ 5 تيرا وبدون أي حمل على السيرفر.",
	}, nil)
}

// handleUpload يستقبل الصورة أو الفيديو ويحفظه مباشرة على Google Drive (إذا توفرت بيانات الربط) أو في مجلد المنظومة
func (m *Module) handleUpload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		response.ModuleError(w, http.StatusMethodNotAllowed, "storage", "METHOD_NOT_ALLOWED", "الطريقة غير مسموحة")
		return
	}

	contentType := r.Header.Get("Content-Type")

	// ١. دعم الرفع المباشر عبر JSON Base64
	if strings.Contains(contentType, "application/json") {
		var req struct {
			Base64    string `json:"base64"`
			Filename  string `json:"filename"`
			Section   string `json:"section"`
			MediaType string `json:"media_type"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			response.ModuleError(w, http.StatusBadRequest, "storage", "INVALID_JSON", "بيانات غير صالحة")
			return
		}

		rawB64 := req.Base64
		if idx := strings.Index(rawB64, ","); idx != -1 {
			rawB64 = rawB64[idx+1:]
		}

		dataBytes, err := base64.StdEncoding.DecodeString(rawB64)
		if err != nil {
			response.ModuleError(w, http.StatusBadRequest, "storage", "INVALID_BASE64", "ترميز الصورة غير صالح")
			return
		}

		sectionFolder := "الأخبار_والتغطيات"
		switch req.Section {
		case "services":
			sectionFolder = "الخدمات_والمرافق"
		case "craftsmen":
			sectionFolder = "الصنايعية_والحرفيين"
		case "events":
			sectionFolder = "المناسبات_والعزاء"
		}

		mediaFolder := "صور"
		ext := ".jpg"
		mimeType := "image/jpeg"
		if req.MediaType == "video" || strings.HasSuffix(req.Filename, ".mp4") {
			mediaFolder = "فيديوهات"
			ext = ".mp4"
			mimeType = "video/mp4"
		}

		timestamp := time.Now().Format("20060102_150405")
		cleanFilename := fmt.Sprintf("%s_%d%s", timestamp, time.Now().UnixNano()%1000, ext)

		// أ. إذا كان حساب Google Drive مربوطاً: الرفع المباشر إلى سحابة درايف 5 تيرا
		if m.driveClient.IsConfigured() {
			driveURL, fileID, driveErr := m.driveClient.UploadDirectToDrive(
				sectionFolder,
				mediaFolder,
				cleanFilename,
				dataBytes,
				mimeType,
			)
			if driveErr == nil && driveURL != "" {
				response.JSON(w, http.StatusCreated, "storage", "v1", map[string]interface{}{
					"url":           driveURL,
					"drive_file_id": fileID,
					"is_drive":      true,
					"folder_path":   fmt.Sprintf("Google_Drive/تطبيق_المنشية/%s/%s", sectionFolder, mediaFolder),
					"filename":      cleanFilename,
					"is_video":      req.MediaType == "video",
					"size_bytes":    len(dataBytes),
					"server_saved":  false,
				}, nil)
				return
			}
		}

		// ب. في حال لم يتم إرفاق ملف المفاتيح بعد: الحفظ في هيكل مجلدات المنظومة مع تنبيه المشرف
		targetDir := filepath.Join(m.baseDir, sectionFolder, mediaFolder)
		_ = os.MkdirAll(targetDir, 0755)
		dstPath := filepath.Join(targetDir, cleanFilename)

		if err := os.WriteFile(dstPath, dataBytes, 0644); err != nil {
			response.ModuleError(w, http.StatusInternalServerError, "storage", "SAVE_ERROR", "تعذر حفظ الملف")
			return
		}

		host := r.Host
		if host == "" || strings.HasPrefix(host, "localhost") || strings.HasPrefix(host, "127.0.0.1") {
			host = "elmansheya.kerd2sy.com"
		}
		scheme := "https"
		if r.Header.Get("X-Forwarded-Proto") == "http" && !strings.Contains(host, "elmansheya.kerd2sy.com") {
			scheme = "http"
		}

		publicRelativePath := fmt.Sprintf("/uploads/Elmansheya_App/%s/%s/%s", sectionFolder, mediaFolder, cleanFilename)
		publicURL := fmt.Sprintf("%s://%s%s", scheme, host, publicRelativePath)

		response.JSON(w, http.StatusCreated, "storage", "v1", map[string]interface{}{
			"url":          publicURL,
			"relative_url": publicRelativePath,
			"filename":     cleanFilename,
			"folder_path":  fmt.Sprintf("تطبيق_المنشية/%s/%s", sectionFolder, mediaFolder),
			"is_drive":     false,
			"is_video":     req.MediaType == "video",
			"size_bytes":   len(dataBytes),
			"drive_notice": "تم الحفظ في مجلد المنظومة. لربط حساب درايف 5 تيرا المباشر، ضع مفتاح Google Cloud في data/google_drive_credentials.json",
		}, nil)
		return
	}

	// ٢. دعم الرفع عبر Multipart Form-Data
	if err := r.ParseMultipartForm(100 << 20); err != nil {
		response.ModuleError(w, http.StatusBadRequest, "storage", "FILE_TOO_LARGE", "حجم الملف كبير جداً (الحد الأقصى 100 ميجا)")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		response.ModuleError(w, http.StatusBadRequest, "storage", "MISSING_FILE", "يرجى إرفاق ملف الصورة أو الفيديو")
		return
	}
	defer file.Close()

	sectionParam := strings.TrimSpace(r.URL.Query().Get("section"))
	if sectionParam == "" {
		sectionParam = strings.TrimSpace(r.FormValue("section"))
	}

	var sectionFolder string
	switch sectionParam {
	case "services":
		sectionFolder = "الخدمات_والمرافق"
	case "craftsmen":
		sectionFolder = "الصنايعية_والحرفيين"
	case "events":
		sectionFolder = "المناسبات_والعزاء"
	default:
		sectionFolder = "الأخبار_والتغطيات"
	}

	mediaTypeParam := strings.TrimSpace(r.URL.Query().Get("media_type"))
	if mediaTypeParam == "" {
		mediaTypeParam = strings.TrimSpace(r.FormValue("media_type"))
	}

	fileContentType := header.Header.Get("Content-Type")
	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext == "" {
		exts, _ := mime.ExtensionsByType(fileContentType)
		if len(exts) > 0 {
			ext = exts[0]
		} else {
			ext = ".jpg"
		}
	}

	isVideo := strings.HasPrefix(fileContentType, "video/") || ext == ".mp4" || ext == ".mov" || ext == ".avi" || mediaTypeParam == "video"
	var mediaFolder string
	mimeType := "image/jpeg"
	if isVideo {
		mediaFolder = "فيديوهات"
		mimeType = "video/mp4"
	} else {
		mediaFolder = "صور"
	}

	timestamp := time.Now().Format("20060102_150405")
	cleanFilename := fmt.Sprintf("%s_%d%s", timestamp, time.Now().UnixNano()%1000, ext)

	fileBytes, err := io.ReadAll(file)
	if err != nil {
		response.ModuleError(w, http.StatusInternalServerError, "storage", "READ_ERROR", "فشل أثناء قراءة الملف")
		return
	}

	// الرفع المباشر لجوجل درايف إذا كانت الإعدادات متوفرة
	if m.driveClient.IsConfigured() {
		driveURL, fileID, driveErr := m.driveClient.UploadDirectToDrive(
			sectionFolder,
			mediaFolder,
			cleanFilename,
			fileBytes,
			mimeType,
		)
		if driveErr == nil && driveURL != "" {
			response.JSON(w, http.StatusCreated, "storage", "v1", map[string]interface{}{
				"url":           driveURL,
				"drive_file_id": fileID,
				"is_drive":      true,
				"folder_path":   fmt.Sprintf("Google_Drive/تطبيق_المنشية/%s/%s", sectionFolder, mediaFolder),
				"filename":      cleanFilename,
				"is_video":      isVideo,
				"size_bytes":    len(fileBytes),
				"server_saved":  false,
			}, nil)
			return
		}
	}

	// بديل محلي لحين إرفاق المفاتيح
	targetDir := filepath.Join(m.baseDir, sectionFolder, mediaFolder)
	_ = os.MkdirAll(targetDir, 0755)
	dstPath := filepath.Join(targetDir, cleanFilename)

	if err := os.WriteFile(dstPath, fileBytes, 0644); err != nil {
		response.ModuleError(w, http.StatusInternalServerError, "storage", "SAVE_ERROR", "تعذر حفظ الملف")
		return
	}

	host := r.Host
	if host == "" || strings.HasPrefix(host, "localhost") || strings.HasPrefix(host, "127.0.0.1") {
		host = "elmansheya.kerd2sy.com"
	}
	scheme := "https"
	if r.Header.Get("X-Forwarded-Proto") == "http" && !strings.Contains(host, "elmansheya.kerd2sy.com") {
		scheme = "http"
	}

	publicRelativePath := fmt.Sprintf("/uploads/Elmansheya_App/%s/%s/%s", sectionFolder, mediaFolder, cleanFilename)
	publicURL := fmt.Sprintf("%s://%s%s", scheme, host, publicRelativePath)

	response.JSON(w, http.StatusCreated, "storage", "v1", map[string]interface{}{
		"url":          publicURL,
		"relative_url": publicRelativePath,
		"filename":     cleanFilename,
		"folder_path":  fmt.Sprintf("تطبيق_المنشية/%s/%s", sectionFolder, mediaFolder),
		"is_drive":     false,
		"is_video":     isVideo,
		"size_bytes":   len(fileBytes),
	}, nil)
}

// handleStructure يعرض شجرة المجلدات والإحصائيات
func (m *Module) handleStructure(w http.ResponseWriter, r *http.Request) {
	sections := []map[string]interface{}{
		{
			"id":          "news",
			"name_ar":     "الأخبار والتغطيات",
			"folder_path": "Elmansheya_App/الأخبار_والتغطيات",
			"subfolders":  []string{"صور", "فيديوهات"},
		},
		{
			"id":          "services",
			"name_ar":     "الخدمات والمرافق",
			"folder_path": "Elmansheya_App/الخدمات_والمرافق",
			"subfolders":  []string{"صور", "فيديوهات"},
		},
		{
			"id":          "craftsmen",
			"name_ar":     "الصنايعية والحرفيين",
			"folder_path": "Elmansheya_App/الصنايعية_والحرفيين",
			"subfolders":  []string{"صور"},
		},
		{
			"id":          "events",
			"name_ar":     "المناسبات والعزاء",
			"folder_path": "Elmansheya_App/المناسبات_والعزاء",
			"subfolders":  []string{"صور", "فيديوهات"},
		},
	}

	response.JSON(w, http.StatusOK, "storage", "v1", map[string]interface{}{
		"app_root": "تطبيق_المنشية",
		"sections": sections,
	}, nil)
}
