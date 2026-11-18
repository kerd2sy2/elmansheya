package auth

const (
	ErrCodeAuthUnavailable    = "AUTH_UNAVAILABLE"
	ErrCodeInvalidCredentials = "INVALID_CREDENTIALS"
	ErrCodePhoneAlreadyExists = "PHONE_ALREADY_EXISTS"
	ErrCodeSessionRevoked     = "SESSION_REVOKED"
	ErrCodeBiometricNotBound  = "BIOMETRIC_NOT_ENABLED"
	ErrCodeDeviceAlreadyBound = "DEVICE_ALREADY_BOUND"
	ErrCodeDeviceMismatch     = "DEVICE_MISMATCH"
)

const (
	ErrMsgAuthUnavailableAr    = "خدمة المصادقة وتسجيل الدخول غير متاحة مؤقتاً."
	ErrMsgInvalidCredentialsAr = "رقم الهاتف أو كلمة المرور غير صحيحة."
	ErrMsgPhoneAlreadyExistsAr = "رقم الهاتف مسجل بالفعل في تطبيق المنشية."
	ErrMsgSessionRevokedAr     = "انتهت الجلسة، يرجى إدخال كلمة المرور لتسجيل الدخول."
	ErrMsgBiometricNotBoundAr  = "يرجى تفعيل الدخول بالبصمة أو الوجه من شاشة حسابي أولاً."
	ErrMsgDeviceAlreadyBoundAr = "هذا الهاتف مسجل به حساب مواطن آخر بالفعل. يُسمح بحساب واحد فقط لكل هاتف منعاً للحسابات الوهمية."
	ErrMsgDeviceMismatchAr    = "هذا الهاتف مخصص ومربوط بحساب مواطن آخر، لا يمكن التبديل بين الحسابات على نفس الجهاز."
)
