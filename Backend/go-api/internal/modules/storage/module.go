package storage

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"elmansheya/go-api/internal/platform/gdrive"
	"elmansheya/go-api/internal/platform/response"
)

type SectionDefinition struct {
	ID       string
	NameAr   string
	FolderAr string
}

var StorageSections = []SectionDefinition{
	{ID: "news", NameAr: "الأخبار والتغطيات", FolderAr: "الأخبار_والتغطيات"},
	{ID: "reports", NameAr: "البلاغات والشكاوى", FolderAr: "البلاغات_والشكاوى"},
	{ID: "craftsmen", NameAr: "الصنايعية والحرفيين", FolderAr: "الصنايعية_والحرفيين"},
	{ID: "services", NameAr: "الخدمات والمرافق", FolderAr: "الخدمات_والمرافق"},
	{ID: "events", NameAr: "المناسبات والعزاء", FolderAr: "المناسبات_والعزاء"},
	{ID: "humanitarian", NameAr: "الحالات الإنسانية", FolderAr: "الحالات_الإنسانية"},
	{ID: "healthcare", NameAr: "الصحة والطوارئ", FolderAr: "الصحة_والطوارئ"},
	{ID: "profile", NameAr: "الملفات الشخصية", FolderAr: "الملفات_الشخصية"},
}

// ResolveSectionFolder يطابق معرف القسم مع مجلده الرسمي داخل Elmansheya على Google Drive
func ResolveSectionFolder(section string) string {
	key := strings.ToLower(strings.TrimSpace(section))
	for _, s := range StorageSections {
		if s.ID == key || s.FolderAr == section {
			return s.FolderAr
		}
	}
	return "الأخبار_والتغطيات"
}

type Module struct {
	driveClient *gdrive.Client
}

func NewModule() *Module {
	client := gdrive.NewClient()
	if client.IsConfigured() {
		go func() {
			if err := client.EnsureFolderStructure(); err != nil {
				log.Printf("[Storage] تعذر تهيئة مجلدات Google Drive (%s): %v", gdrive.DriveRootFolder, err)
			}
		}()
	}

	return &Module{
		driveClient: client,
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
		"target_root_folder":    gdrive.DriveRootFolder,
		"server_disk_storage":   false,
		"storage_mode": func() string {
			if configured {
				return "direct_google_drive_5tb"
			}
			return "drive_not_connected_zero_server_storage"
		}(),
		"credentials_file_path": "Backend/go-api/data/google_drive_credentials.json",
		"instructions_ar":       "تم تهيئة مجلد Elmansheya وتقسيمه حسب الأقسام (صور / فيديوهات) على سحابة جوجل درايف 5 تيرا بدون تخزين أي ملفات على السيرفر.",
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

	// التحقق واختبار الوصول إلى مجلد Elmansheya وإنشاء شجرة الأقسام على جوجل درايف
	rootID, err := m.driveClient.GetOrCreateFolder(gdrive.DriveRootFolder, "")
	if err != nil {
		response.JSON(w, http.StatusOK, "storage", "v1", map[string]interface{}{
			"success":                 true,
			"google_drive_configured": true,
			"client_email":            testSA.ClientEmail,
			"warning":                 fmt.Sprintf("تم حفظ المفتاح، ولكن تعذر الوصول لمجلد درايف (%s): %v. يرجى التأكد من تفعيل Google Drive API ومشاركة المجلد مع: %s", gdrive.DriveRootFolder, err, testSA.ClientEmail),
		}, nil)
		return
	}

	_ = m.driveClient.EnsureFolderStructure()

	response.JSON(w, http.StatusOK, "storage", "v1", map[string]interface{}{
		"success":                 true,
		"google_drive_configured": true,
		"client_email":            testSA.ClientEmail,
		"root_folder_id":          rootID,
		"root_folder_name":        gdrive.DriveRootFolder,
		"message":                 "تم ربط حساب Google Drive بنجاح! سيتم حفظ الصور والفيديوهات مباشرة داخل مجلد Elmansheya على سحابتك الـ 5 تيرا وبدون أي حمل على السيرفر.",
	}, nil)
}

func (m *Module) uploadToDriveOrFail(w http.ResponseWriter, section, ext, mimeType string, isVideo bool, data []byte) {
	if !m.driveClient.IsConfigured() {
		response.ModuleError(
			w,
			http.StatusServiceUnavailable,
			"storage",
			"DRIVE_UPLOAD_REQUIRED",
			"حساب Google Drive غير مربوط حالياً؛ تم منع الحفظ على السيرفر. يرجى ربط مساحة الـ 5 تيرا أولاً.",
		)
		return
	}

	sectionFolder := ResolveSectionFolder(section)
	mediaFolder := "صور"
	if isVideo {
		mediaFolder = "فيديوهات"
	}

	timestamp := time.Now().Format("20060102_150405")
	cleanFilename := fmt.Sprintf("%s_%d%s", timestamp, time.Now().UnixNano()%1000, ext)

	driveURL, fileID, driveErr := m.driveClient.UploadDirectToDrive(
		sectionFolder,
		mediaFolder,
		cleanFilename,
		data,
		mimeType,
	)
	if driveErr != nil || driveURL == "" {
		log.Printf("[Storage] Google Drive upload error (%s/%s): %v", sectionFolder, mediaFolder, driveErr)
		response.ModuleError(
			w,
			http.StatusServiceUnavailable,
			"storage",
			"DRIVE_UPLOAD_REQUIRED",
			fmt.Sprintf("تعذر رفع الملف إلى Google Drive (%s) ولم يتم حفظه على السيرفر: %v", gdrive.DriveRootFolder, driveErr),
		)
		return
	}

	response.JSON(w, http.StatusCreated, "storage", "v1", map[string]interface{}{
		"url":           driveURL,
		"drive_file_id": fileID,
		"is_drive":      true,
		"folder_path":   fmt.Sprintf("%s/%s/%s", gdrive.DriveRootFolder, sectionFolder, mediaFolder),
		"filename":      cleanFilename,
		"is_video":      isVideo,
		"size_bytes":    len(data),
		"server_saved":  false,
	}, nil)
}

// handleUpload يستقبل الصورة أو الفيديو ويرفعه مباشرة على Google Drive فقط دون حفظه على السيرفر
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
			response.ModuleError(w, http.StatusBadRequest, "storage", "INVALID_BASE64", "ترميز الملف غير صالح")
			return
		}

		lowerName := strings.ToLower(req.Filename)
		isVideo := req.MediaType == "video" || strings.HasSuffix(lowerName, ".mp4") || strings.HasSuffix(lowerName, ".mov") || strings.HasSuffix(lowerName, ".avi")
		ext := strings.ToLower(filepath.Ext(req.Filename))
		mimeType := "image/jpeg"
		if isVideo {
			if ext == "" {
				ext = ".mp4"
			}
			mimeType = "video/mp4"
		} else if ext == "" {
			ext = ".jpg"
		}

		m.uploadToDriveOrFail(w, req.Section, ext, mimeType, isVideo, dataBytes)
		return
	}

	// ٢. دعم الرفع عبر Multipart Form-Data (حتى 150 ميجابايت في الذاكرة المؤقتة قبل الدفع مباشرة إلى درايف)
	if err := r.ParseMultipartForm(150 << 20); err != nil {
		response.ModuleError(w, http.StatusBadRequest, "storage", "FILE_TOO_LARGE", "حجم الملف كبير جداً (الحد الأقصى 150 ميجا)")
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
	mimeType := "image/jpeg"
	if isVideo {
		mimeType = "video/mp4"
	}

	fileBytes, err := io.ReadAll(file)
	if err != nil {
		response.ModuleError(w, http.StatusInternalServerError, "storage", "READ_ERROR", "فشل أثناء قراءة الملف")
		return
	}

	m.uploadToDriveOrFail(w, sectionParam, ext, mimeType, isVideo, fileBytes)
}

// handleStructure يعرض شجرة المجلدات الرسمية على Google Drive
func (m *Module) handleStructure(w http.ResponseWriter, r *http.Request) {
	sections := make([]map[string]interface{}, 0, len(StorageSections))
	for _, s := range StorageSections {
		sections = append(sections, map[string]interface{}{
			"id":          s.ID,
			"name_ar":     s.NameAr,
			"folder_path": fmt.Sprintf("%s/%s", gdrive.DriveRootFolder, s.FolderAr),
			"subfolders":  gdrive.MediaSubfolders,
		})
	}

	response.JSON(w, http.StatusOK, "storage", "v1", map[string]interface{}{
		"app_root": gdrive.DriveRootFolder,
		"sections": sections,
	}, nil)
}
