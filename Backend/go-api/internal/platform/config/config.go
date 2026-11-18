package config

import (
	"os"
	"time"
)

type Config struct {
	AppName         string
	Environment     string
	HTTPPort        string
	DatabaseURL     string
	RedisAddr       string
	QueryTimeout    time.Duration
	NewsCacheTTL    time.Duration
	ViewsFlushTimer time.Duration
}

func Load() *Config {
	return &Config{
		AppName:         getEnv("APP_NAME", "El-Mansheya API"),
		Environment:     getEnv("APP_ENV", "development"),
		HTTPPort:        getEnv("HTTP_PORT", "8080"),
		DatabaseURL:     getEnv("DATABASE_URL", "postgres://elmansheya:elmansheya_secret_dev@localhost:5432/elmansheya_db?sslmode=disable"),
		RedisAddr:       getEnv("REDIS_ADDR", "localhost:6379"),
		QueryTimeout:    5 * time.Second,
		NewsCacheTTL:    30 * time.Second,
		ViewsFlushTimer: 30 * time.Second,
	}
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
