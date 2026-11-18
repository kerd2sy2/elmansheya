-- التراجع الآمن عن المخطط الأساسي (Down Migration)
BEGIN;

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS notification_preferences;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS report_status_history;
DROP TABLE IF EXISTS report_media;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS pharmacies;
DROP TABLE IF EXISTS medical_services;
DROP TABLE IF EXISTS donations;
DROP TABLE IF EXISTS humanitarian_cases;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS service_categories;
DROP TABLE IF EXISTS ratings;
DROP TABLE IF EXISTS craftsmen_categories;
DROP TABLE IF EXISTS craftsmen;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS news_views;
DROP TABLE IF EXISTS news_media;
DROP TABLE IF EXISTS news;
DROP TABLE IF EXISTS verification_reviews;
DROP TABLE IF EXISTS verification_requests;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS supervisor_assignments;
DROP TABLE IF EXISTS supervisors;
DROP TABLE IF EXISTS user_profiles;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS roles;

COMMIT;
