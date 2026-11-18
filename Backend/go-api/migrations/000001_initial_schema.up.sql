-- ============================================================================
-- تطبيق المنشية (Al-Mansheya) - المخطط الأساسي لقاعدة البيانات (PostgreSQL)
-- يحتوي على جميع الجداول الـ 25 المحددة في وثيقة المواصفات مع الفهارس (Indexes)
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. الصلاحيات والأدوار والمشرفون (Permissions, Roles & Supervisors)
-- ============================================================================

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL, -- citizen, general_supervisor, news_supervisor, services_supervisor, reports_supervisor, support_agent, system_admin
    name_ar VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL,
    module VARCHAR(50) NOT NULL,
    description_ar TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- ============================================================================
-- 2. الحسابات والملفات الشخصية (Users & Profiles)
-- ============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role_id UUID NOT NULL REFERENCES roles(id),
    verification_status VARCHAR(30) NOT NULL DEFAULT 'unverified'
        CHECK (verification_status IN ('unverified', 'pending_review', 'verified', 'rejected', 'reupload_required')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON users(phone) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_verification_status ON users(verification_status);

CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    avatar_url TEXT,
    area VARCHAR(120),
    biometric_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    reports_count INT NOT NULL DEFAULT 0,
    ratings_count INT NOT NULL DEFAULT 0,
    general_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_area ON user_profiles(area);

CREATE TABLE supervisors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title_ar VARCHAR(120) NOT NULL,
    is_general_supervisor BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE supervisor_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supervisor_id UUID NOT NULL REFERENCES supervisors(id) ON DELETE CASCADE,
    domain_type VARCHAR(50) NOT NULL CHECK (domain_type IN ('news', 'service_category', 'report_type', 'humanitarian', 'healthcare', 'events')),
    domain_key VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (supervisor_id, domain_type, domain_key)
);

-- ============================================================================
-- 3. الجلسات وتوكنات الدخول (Sessions & Refresh Tokens)
-- ============================================================================

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_name VARCHAR(150),
    device_os VARCHAR(50),
    ip_address VARCHAR(64),
    biometric_bound BOOLEAN NOT NULL DEFAULT FALSE,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id) WHERE is_revoked = FALSE;

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    token_hash VARCHAR(128) UNIQUE NOT NULL,
    replaced_by_id UUID REFERENCES refresh_tokens(id),
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_session ON refresh_tokens(session_id);

-- ============================================================================
-- 4. نظام توثيق حساب المواطن (Account Verification - Private Encrypted Storage)
-- ============================================================================

CREATE TABLE verification_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number BIGSERIAL UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- مسار الكائن المشفر داخل المساحة الخاصة غير العامة (لا يتم تخزين الصورة في الداتابيز ولا في مسار عام)
    private_id_front_object_key TEXT NOT NULL,
    private_id_back_object_key TEXT,
    encryption_key_id VARCHAR(120) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending_review'
        CHECK (status IN ('unverified', 'pending_review', 'verified', 'rejected', 'reupload_required')),
    support_notes TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES users(id)
);

CREATE INDEX idx_verification_requests_user ON verification_requests(user_id, submitted_at DESC);
CREATE INDEX idx_verification_requests_status ON verification_requests(status, submitted_at ASC);

CREATE TABLE verification_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES verification_requests(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(40) NOT NULL CHECK (action IN ('viewed_document', 'approved', 'rejected', 'requested_reupload')),
    notes TEXT,
    ip_address VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_verification_reviews_request ON verification_reviews(request_id, created_at DESC);

-- ============================================================================
-- 5. الأخبار والميديا والمشاهدات (News, Media & Views - High Scale Ready)
-- ============================================================================

CREATE TABLE news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(300) NOT NULL,
    summary TEXT NOT NULL,
    content TEXT NOT NULL,
    cover_image_url TEXT,
    author_id UUID NOT NULL REFERENCES users(id),
    author_display_name VARCHAR(150) NOT NULL,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    pin_order INT NOT NULL DEFAULT 0,
    is_breaking BOOLEAN NOT NULL DEFAULT FALSE,
    breaking_expires_at TIMESTAMPTZ,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    views_count BIGINT NOT NULL DEFAULT 0,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- فهرس مخصص لـ Cursor Pagination وترتيب الأخبار المثبتة ثم الأحدث
CREATE INDEX idx_news_feed_cursor ON news (is_pinned DESC, pin_order ASC, published_at DESC, id DESC)
    WHERE is_archived = FALSE;

CREATE INDEX idx_news_breaking ON news (published_at DESC)
    WHERE is_breaking = TRUE AND is_archived = FALSE;

CREATE INDEX idx_news_archive_search ON news (published_at DESC, id DESC)
    WHERE is_archived = TRUE;

CREATE TABLE news_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    news_id UUID NOT NULL REFERENCES news(id) ON DELETE CASCADE,
    media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('image', 'video')),
    media_url TEXT NOT NULL,
    stream_manifest_url TEXT, -- لبث الفيديو المباشر HLS/DASH دون تحميل الملف بالكامل
    thumbnail_url TEXT,
    duration_seconds INT,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_news_media_news_id ON news_media(news_id, sort_order ASC);

CREATE TABLE news_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    news_id UUID NOT NULL REFERENCES news(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    device_fingerprint VARCHAR(128),
    viewed_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (news_id, device_fingerprint, viewed_date)
);

-- ============================================================================
-- 6. الصنايعية والتصنيفات والتقييمات (Craftsmen, Categories & Ratings)
-- ============================================================================

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(80) UNIQUE NOT NULL,
    name_ar VARCHAR(120) NOT NULL,
    icon_name VARCHAR(80) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE craftsmen (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    full_name VARCHAR(150) NOT NULL,
    nickname VARCHAR(120),
    specialty VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    area VARCHAR(120) NOT NULL,
    avatar_url TEXT,
    services_description TEXT NOT NULL,
    is_accredited BOOLEAN NOT NULL DEFAULT FALSE,
    average_rating NUMERIC(3,2) NOT NULL DEFAULT 0.00,
    ratings_count INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- فهرس ترتيب الصنايعية حسب الأعلى تقييماً أولاً + البحث بالمنطقة والحرفة
CREATE INDEX idx_craftsmen_rating_sort ON craftsmen (average_rating DESC, ratings_count DESC, id ASC)
    WHERE is_active = TRUE;
CREATE INDEX idx_craftsmen_area ON craftsmen (area) WHERE is_active = TRUE;

CREATE TABLE craftsmen_categories (
    craftsman_id UUID NOT NULL REFERENCES craftsmen(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (craftsman_id, category_id)
);

CREATE TABLE ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    craftsman_id UUID NOT NULL REFERENCES craftsmen(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stars SMALLINT NOT NULL CHECK (stars BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (craftsman_id, user_id) -- كل مواطن مسجل له تقييم واحد لكل صنايعي يمكنه تعديله أو حذفه
);

CREATE INDEX idx_ratings_craftsman ON ratings(craftsman_id, created_at DESC);
CREATE INDEX idx_ratings_user ON ratings(user_id, updated_at DESC);

-- ============================================================================
-- 7. الخدمات، المناسبات، الحالات الإنسانية، والصحة (Services, Events, Humanitarian, Healthcare)
-- ============================================================================

CREATE TABLE service_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(80) UNIQUE NOT NULL,
    name_ar VARCHAR(120) NOT NULL,
    icon_name VARCHAR(80) NOT NULL,
    description_ar TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    contact_phone VARCHAR(30),
    working_hours VARCHAR(200),
    address_text TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    managed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_services_category ON services(category_id, created_at DESC) WHERE is_active = TRUE;

CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    event_type VARCHAR(80) NOT NULL, -- فرح، عزاء، ندوة، قافلة طبية، مناسبة عامة...
    event_date DATE NOT NULL,
    event_time VARCHAR(50) NOT NULL,
    location_name VARCHAR(250) NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_date ON events(event_date DESC) WHERE is_active = TRUE;

CREATE TABLE humanitarian_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_title VARCHAR(200) NOT NULL,
    case_details TEXT NOT NULL,
    need_description TEXT NOT NULL,
    donation_details TEXT NOT NULL,
    responsible_entity VARCHAR(200) NOT NULL,
    contact_phone VARCHAR(30),
    target_amount NUMERIC(12,2),
    collected_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'Archived')),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES humanitarian_cases(id) ON DELETE CASCADE,
    donor_name VARCHAR(150),
    amount NUMERIC(12,2) NOT NULL,
    reference_note TEXT,
    recorded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE medical_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_name VARCHAR(200) NOT NULL,
    entity_type VARCHAR(60) NOT NULL CHECK (entity_type IN ('hospital', 'clinic', 'ambulance', 'emergency_unit', 'doctor', 'lab')),
    contact_phone VARCHAR(50) NOT NULL,
    schedule_text TEXT NOT NULL,
    services_offered TEXT NOT NULL,
    address_text TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    is_emergency_24h BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pharmacies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_name VARCHAR(200) NOT NULL,
    contact_phone VARCHAR(50) NOT NULL,
    working_hours TEXT NOT NULL,
    services_offered TEXT NOT NULL,
    address_text TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    is_night_shift BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 8. البلاغات ومتابعتها (Reports, Media & Status History - Privacy Enforced)
-- ============================================================================

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_number BIGSERIAL UNIQUE NOT NULL,
    reporter_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN (
        'sanitation',        -- 1. النظافة
        'sewage',            -- 2. الصرف الصحي
        'electricity',       -- 3. الكهرباء والإنارة
        'roads',             -- 4. الطرق
        'water',             -- 5. المياه
        'encroachments',     -- 6. الإشغالات
        'schools_facilities',-- 7. المدارس والمرافق
        'lost_and_found',    -- 8. المفقودات
        'general'            -- 9. البلاغات العامة
    )),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    manual_address TEXT NOT NULL,
    incident_date DATE NOT NULL,
    incident_time VARCHAR(40) NOT NULL,
    assigned_supervisor_id UUID REFERENCES supervisors(id),
    status VARCHAR(30) NOT NULL DEFAULT 'new' CHECK (status IN (
        'new',               -- 1. جديد
        'under_review',      -- 2. قيد المراجعة
        'in_progress',       -- 3. جاري العمل
        'resolved',          -- 4. تم الحل
        'rejected'           -- 5. مرفوض
    )),
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    -- توثيق الحل الاختياري من المشرف
    resolution_image_url TEXT,
    resolution_summary TEXT,
    resolution_details TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_reporter ON reports(reporter_user_id, created_at DESC);
CREATE INDEX idx_reports_public_feed ON reports(created_at DESC) WHERE is_public = TRUE;
CREATE INDEX idx_reports_type_status ON reports(report_type, status, created_at DESC);

CREATE TABLE report_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('image', 'video')),
    media_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE report_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    old_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    changed_by UUID REFERENCES users(id),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_report_status_history_report ON report_status_history(report_id, created_at ASC);

-- ============================================================================
-- 9. الإشعارات وتفضيلاتها + سجل العمليات (Notifications & Audit Logs)
-- ============================================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN (
        'breaking_news',        -- 1. الأخبار العاجلة
        'new_news',             -- 2. الأخبار الجديدة
        'events',               -- 3. المناسبات
        'services',             -- 4. الخدمات
        'humanitarian_cases',   -- 5. الحالات الإنسانية
        'report_updates',       -- 6. تحديثات البلاغات
        'verification_updates', -- 7. تحديثات توثيق الحساب
        'admin_announcements'   -- 8. الإعلانات الإدارية
    )),
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    reference_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);

CREATE TABLE notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    breaking_news BOOLEAN NOT NULL DEFAULT TRUE,
    new_news BOOLEAN NOT NULL DEFAULT TRUE,
    events BOOLEAN NOT NULL DEFAULT TRUE,
    services BOOLEAN NOT NULL DEFAULT TRUE,
    humanitarian_cases BOOLEAN NOT NULL DEFAULT TRUE,
    report_updates BOOLEAN NOT NULL DEFAULT TRUE,
    verification_updates BOOLEAN NOT NULL DEFAULT TRUE,
    admin_announcements BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_role VARCHAR(50),
    module VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(60),
    target_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_module_created ON audit_logs(module, created_at DESC);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_user_id, created_at DESC);

-- ============================================================================
-- 10. البيانات التأسيسية للأدوار الـ 7 وتصنيفات الخدمات الـ 9 (Seed Data)
-- ============================================================================

INSERT INTO roles (code, name_ar, description) VALUES
    ('citizen', 'المواطن', 'مشاهدة المحتوى وتقديم البلاغات والتقييمات'),
    ('general_supervisor', 'المشرف العام', 'إدارة المحتوى وجميع الأقسام'),
    ('news_supervisor', 'مشرف الأخبار', 'إدارة الأخبار حسب الصلاحيات'),
    ('services_supervisor', 'مشرف الخدمات', 'إدارة الخدمات المخصصة'),
    ('reports_supervisor', 'مشرف البلاغات', 'مراجعة البلاغات ومتابعتها'),
    ('support_agent', 'موظف الدعم', 'مراجعة طلبات توثيق الحساب ومساعدة المواطنين'),
    ('system_admin', 'مدير النظام', 'إدارة النظام والمشرفين والصلاحيات');

INSERT INTO service_categories (slug, name_ar, icon_name, sort_order) VALUES
    ('events', 'المناسبات', 'calendar', 1),
    ('humanitarian', 'الحالات الإنسانية', 'heart', 2),
    ('healthcare', 'الصحة والطوارئ والصيدليات', 'medkit', 3),
    ('village_issues', 'خدمات ومشاكل القرية', 'megaphone', 4),
    ('transportation', 'المواصلات والسيارات', 'car', 5),
    ('education', 'المدارس والتعليم', 'school', 6),
    ('mosques_charities', 'المساجد والجمعيات', 'home', 7),
    ('gov_offices', 'المصالح الحكومية والبريد', 'business', 8),
    ('shops_markets', 'المحلات والأسواق', 'cart', 9);

COMMIT;
