# توثيق عقود الواجهة البرمجية (API Contracts) — تطبيق المنشية

النسخة الأساسية: `v1`  
المسار الأساسي (Base URL): `/api/v1`

---

## 1. الغلاف الموحد للاستجابات وعزل أخطاء الموديولات (Unified Envelope & Fault Isolation)

جميع استجابات الخادم تتبع هيكلاً موحداً يضمن للواجهة الأمامية معرفة الموديول المستجيب بدقة، وعزل أي عطل داخل الموديول المتضرر فقط:

### استجابة ناجحة (`200 OK` / `201 Created`):
```json
{
  "success": true,
  "module": "news",
  "version": "v42",
  "data": { ... },
  "meta": {
    "next_cursor": "2026-11-09T02:00:00Z_uuid",
    "has_more": true
  }
}
```

### استجابة عدم تغير البيانات (`304 Not Modified` — للأخبار المليونية):
- يرسل التطبيق ترويسة `If-None-Match: "v42"`.
- إذا لم ينشر المشرف خبراً جديداً، يرد الخادم بحالة **`304 Not Modified` بدون جسم استجابة (0 Bytes)**، ويعرض التطبيق البيانات من الكاش المحلي فوراً.

### استجابة عطل معزول في موديول (`503 Service Unavailable` / `500` / `4xx`):
إذا تعطلت موديول واحدة (مثلاً `craftsmen`)، لا يتأثر الخادم ولا باقي الموديولات، وتُرجع الموديول المتعطلة فقط:
```json
{
  "success": false,
  "module": "craftsmen",
  "isolated": true,
  "error": {
    "code": "MODULE_RUNTIME_ERROR",
    "message": "خدمة الصنايعية غير متاحة مؤقتاً، بينما تعمل باقي خدمات التطبيق بشكل طبيعي. يرجى المحاولة لاحقاً."
  }
}
```

---

## 2. نقاط الفحص والمراقبة (Health & Module Status)

| الطريقة | المسار | الوصف |
|---|---|---|
| `GET` | `/api/v1/health/modules` | يعرض الحالة الحية لكل موديول من الـ 14 موديول (`HEALTHY` أو `DEGRADED`) وإحصائيات الكاش |

---

## 3. عقود الموديولات الـ 14 المستقلة

### 3.1 موديول المصادقة والحسابات (`auth` & `users`)
- `POST /api/v1/auth/login` — تسجيل الدخول برقم الهاتف وكلمة المرور (يُرجع `access_token` قصير العمر + `refresh_token`).
- `POST /api/v1/auth/refresh` — تدوير `refresh_token`.
- `POST /api/v1/auth/logout` — تسجيل الخروج وإبطال الجلسة.
- `GET /api/v1/users/me` — بيانات شاشة حسابي (الاسم، الهاتف، الصورة، المنطقة، تاريخ التسجيل، عدد البلاغات، عدد التقييمات، حالة التوثيق).
- `PATCH /api/v1/users/me` — تعديل الاسم، الصورة الشخصية، والمنطقة.
- `POST /api/v1/users/me/password` — تغيير كلمة المرور (القديمة + الجديدة).
- `DELETE /api/v1/users/me` — حذف الحساب بعد تأكيد كلمة المرور/الهوية.
- `GET /api/v1/users/me/activity-logs` — سجل نشاط المواطن بالتاريخ والوقت.

### 3.2 موديول توثيق الحساب (`verification`)
- `GET /api/v1/verification/status` — عرض حالة التوثيق الحالية (`unverified`, `pending_review`, `verified`, `rejected`, `reupload_required`) وملاحظات الدعم.
- `POST /api/v1/verification/submit` — رفع صورة البطاقة القومية إلى المساحة المشفرة الخاصة وإرسال طلب التوثيق.
- `GET /api/v1/admin/verification/requests` — (لموظف الدعم المخول فقط) عرض ومراجعة الطلبات مع تسجيل كل مشاهدة في `audit_logs`.
- `POST /api/v1/admin/verification/requests/{id}/review` — اعتماد أو رفض أو طلب إعادة رفع البطاقة.

### 3.3 موديول الأخبار (`news`) — مدعوم بـ `ETag` + `Singleflight` + `L1/Redis Cache`
- `GET /api/v1/news/feed?cursor=...&limit=15` — يرجع:
  - `breaking_news`: شريط الأخبار العاجلة.
  - `pinned_featured`: الخبر الرئيسي المثبت (أو الأخبار المثبتة).
  - `items`: الأخبار الصغيرة مرتبة حسب الأحدث مع `next_cursor`.
- `GET /api/v1/news/archive?q=...&cursor=...` — أرشيف الأخبار القديمة مع البحث.
- `GET /api/v1/news/{id}` — تفاصيل الخبر الكامل + زيادة عداد المشاهدات المجمّع (`Batched View Counter`).

### 3.4 موديول الصنايعية والتقييمات (`craftsmen` & `ratings`)
- `GET /api/v1/craftsmen/categories` — شبكة تصنيفات الحرف والأيقونات (`Grid`).
- `GET /api/v1/craftsmen?name=...&nickname=...&specialty=...&area=...&category_id=...` — قائمة الصنايعية مرتبة حسب **الأعلى تقييماً أولاً** مع دعم البحث المتعدد.
- `POST /api/v1/ratings` — إضافة تقييم (1–5 نجوم + تعليق) لمواطن مسجل.
- `PUT /api/v1/ratings/{id}` — تعديل التقييم في أي وقت.
- `DELETE /api/v1/ratings/{id}` — حذف التقييم.
- `GET /api/v1/users/me/ratings` — قائمة "تقييماتي" في شاشة حسابي.

### 3.5 موديولات الخدمات، المناسبات، الحالات الإنسانية، والصحة (`services`, `events`, `humanitarian`, `healthcare`)
- `GET /api/v1/services/categories` — التصنيفات الـ 9 الرئيسية لدليل الخدمات.
- `GET /api/v1/events` — قائمة المناسبات (الاسم، النوع، التاريخ، الوقت، المكان، الموقع على الخريطة).
- `GET /api/v1/humanitarian` — الحالات الإنسانية وبيانات التبرعات والجهة المسؤولة.
- `GET /api/v1/healthcare` — خدمات الصحة والطوارئ والصيدليات والمواعيد.

### 3.6 موديول البلاغات (`reports`)
- `POST /api/v1/reports` — إرسال بلاغ جديد ضمن الأنواع الـ 9 مع التوجيه التلقائي للمشرف المختص.
- `GET /api/v1/reports/my` — بلاغات المواطن بالتفصيل وحالتها (`new`, `under_review`, `in_progress`, `resolved`, `rejected`).
- `GET /api/v1/reports/public` — البلاغات العامة للقرية (**مع إخفاء اسم وبيانات صاحب البلاغ تماماً**).
- `PATCH /api/v1/admin/reports/{id}/status` — تحديث حالة البلاغ من المشرف المختص + توثيق الحل الاختياري (صورة + وصف) + إرسال إشعار فوري للمواطن.

### 3.7 موديول الإشعارات والصلاحيات وسجل العمليات (`notifications`, `permissions`, `audit_logs`)
- `GET /api/v1/notifications` — قائمة إشعارات المواطن.
- `GET /api/v1/notifications/preferences` & `PUT /api/v1/notifications/preferences` — تفعيل/تعطيل كل نوع من الأنواع الـ 8 بشكل مستقل.
- `GET /api/v1/permissions/roles` — إدارة الأدوار والصلاحيات.
- `GET /api/v1/audit-logs` — سجل العمليات الإدارية الحساسة.
