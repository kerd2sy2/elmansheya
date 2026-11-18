package news

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"elmansheya/go-api/internal/platform/cache"
)

type Service struct {
	repo      Repository
	highCache *cache.HighScaleCache
	cacheTTL  time.Duration
}

func NewService(repo Repository, highCache *cache.HighScaleCache, cacheTTL time.Duration) *Service {
	return &Service{
		repo:      repo,
		highCache: highCache,
		cacheTTL:  cacheTTL,
	}
}

func (s *Service) GetHomeFeed(ctx context.Context, cursor string, limit int) (*NewsFeedResponseDTO, string, error) {
	cacheKey := fmt.Sprintf("news:feed:cursor=%s:limit=%d", cursor, limit)

	entry, err := s.highCache.GetOrFetchSingleflight(cacheKey, s.cacheTTL, func() (interface{}, error) {
		queryCtx, cancel := context.WithTimeout(ctx, 4*time.Second)
		defer cancel()
		return s.repo.FetchHomeFeed(queryCtx, cursor, limit)
	})
	if err != nil {
		return nil, "", err
	}

	feed, _ := entry.Payload.(*NewsFeedResponseDTO)
	return feed, entry.Version, nil
}

// PublishNews يحفظ الخبر الحقيقي ويقوم فوراً بتحديث نسخة الـ ETag في الكاش المليوني
func (s *Service) PublishNews(ctx context.Context, req PublishNewsRequestDTO) (*NewsCardDTO, string, error) {
	if strings.TrimSpace(req.Title) == "" || strings.TrimSpace(req.Summary) == "" {
		return nil, "", errors.New("عنوان الخبر وملخصه مطلوبان")
	}

	card, err := s.repo.PublishNews(ctx, req)
	if err != nil {
		return nil, "", err
	}

	newVersion := s.highCache.InvalidateAndBumpVersion("news:")
	return card, newVersion, nil
}

func (s *Service) DeleteNews(ctx context.Context, id string) (string, error) {
	if strings.TrimSpace(id) == "" {
		return "", errors.New("معرف الخبر مطلوب")
	}
	if err := s.repo.DeleteNews(ctx, strings.TrimSpace(id)); err != nil {
		return "", err
	}
	newVersion := s.highCache.InvalidateAndBumpVersion("news:")
	return newVersion, nil
}

func (s *Service) GetNewsDetail(ctx context.Context, id string) (*NewsCardDTO, error) {
	card, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	// زيادة عداد المشاهدات تلقائياً في الكاش المليوني وتحديثه
	views := s.RecordView(id)
	card.ViewsCount = views
	return card, nil
}

func (s *Service) RecordView(newsID string) int64 {
	return s.highCache.IncrementView(newsID)
}
