package response

import (
	"encoding/json"
	"net/http"
)

// Envelope يمثل الغلاف الموحد لجميع استجابات الخادم
type Envelope struct {
	Success  bool        `json:"success"`
	Module   string      `json:"module"`
	Version  string      `json:"version,omitempty"`
	Isolated bool        `json:"isolated,omitempty"`
	Data     interface{} `json:"data,omitempty"`
	Meta     interface{} `json:"meta,omitempty"`
	Error    *ErrorBody  `json:"error,omitempty"`
}

type ErrorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// JSON يرسل استجابة ناجحة موحدة مع اسم الموديول ونسخة الكاش (ETag)
func JSON(w http.ResponseWriter, status int, module string, version string, data interface{}, meta interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	if version != "" {
		w.Header().Set("ETag", `"`+version+`"`)
	}
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(Envelope{
		Success: true,
		Module:  module,
		Version: version,
		Data:    data,
		Meta:    meta,
	})
}

// ModuleError يرسل خطأ معزولاً خاصاً بموديول محددة دون التأثير على باقي الموديولات
func ModuleError(w http.ResponseWriter, status int, module string, code string, messageAr string) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(Envelope{
		Success:  false,
		Module:   module,
		Isolated: true,
		Error: &ErrorBody{
			Code:    code,
			Message: messageAr,
		},
	})
}
