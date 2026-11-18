package news

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"elmansheya/go-api/internal/platform/database"
)

// Repository يعزل استعلامات وحفظ الأخبار الحقيقية على القرص بدون أي بيانات وهمية
type Repository interface {
	FetchHomeFeed(ctx context.Context, cursor string, limit int) (*NewsFeedResponseDTO, error)
	PublishNews(ctx context.Context, req PublishNewsRequestDTO) (*NewsCardDTO, error)
	DeleteNews(ctx context.Context, id string) error
	FindByID(ctx context.Context, id string) (*NewsCardDTO, error)
}

type persistedNewsStore struct {
	BreakingNews   []BreakingNewsDTO `json:"breaking_news"`
	PinnedFeatured []NewsCardDTO     `json:"pinned_featured"`
	SmallNews      []NewsCardDTO     `json:"small_news"`
}

type diskRepository struct {
	mu    sync.RWMutex
	store *database.PersistentFileStore
	data  persistedNewsStore
}

func NewRepository() Repository {
	repo := &diskRepository{
		store: database.NewPersistentFileStore("news.json"),
		data: persistedNewsStore{
			BreakingNews:   []BreakingNewsDTO{},
			PinnedFeatured: []NewsCardDTO{},
			SmallNews:      []NewsCardDTO{},
		},
	}
	_ = repo.store.Load(&repo.data)
	if repo.data.BreakingNews == nil {
		repo.data.BreakingNews = []BreakingNewsDTO{}
	}
	if repo.data.PinnedFeatured == nil {
		repo.data.PinnedFeatured = []NewsCardDTO{}
	}
	if repo.data.SmallNews == nil {
		repo.data.SmallNews = []NewsCardDTO{}
	}
	return repo
}

func (r *diskRepository) FetchHomeFeed(ctx context.Context, cursor string, limit int) (*NewsFeedResponseDTO, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	return &NewsFeedResponseDTO{
		BreakingNews:   r.data.BreakingNews,
		PinnedFeatured: r.data.PinnedFeatured,
		SmallNews:      r.data.SmallNews,
		NextCursor:     "",
		HasMore:        false,
	}, nil
}

func (r *diskRepository) PublishNews(ctx context.Context, req PublishNewsRequestDTO) (*NewsCardDTO, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()
	id := fmt.Sprintf("news-%d", now.UnixNano())
	author := req.AuthorDisplayName
	if author == "" {
		author = "إدارة المنشية"
	}

	if req.IsBreaking {
		r.data.BreakingNews = append([]BreakingNewsDTO{
			{
				ID:          "brk-" + id,
				Title:       req.Title,
				PublishedAt: now,
			},
		}, r.data.BreakingNews...)
	}

	card := NewsCardDTO{
		ID:                id,
		Title:             req.Title,
		Summary:           req.Summary,
		CoverImageURL:     req.CoverImageURL,
		VideoStreamURL:    req.VideoStreamURL,
		AuthorDisplayName: author,
		AuthorIsVerified:  req.AuthorIsVerified,
		AuthorBadgeLabel:  req.AuthorBadgeLabel,
		PublishedAt:       now,
		ViewsCount:        1,
		IsFeatured:        req.IsPinnedFeatured,
		IsPinned:          req.IsPinnedFeatured,
		HasLongText:       len(req.Summary) > 80,
		AspectRatio:       req.AspectRatio,
	}

	if req.IsPinnedFeatured {
		r.data.PinnedFeatured = append([]NewsCardDTO{card}, r.data.PinnedFeatured...)
	} else {
		r.data.SmallNews = append([]NewsCardDTO{card}, r.data.SmallNews...)
	}

	if err := r.store.Save(&r.data); err != nil {
		return nil, err
	}
	return &card, nil
}

func (r *diskRepository) DeleteNews(ctx context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	var newBreaking []BreakingNewsDTO
	for _, b := range r.data.BreakingNews {
		if b.ID != id {
			newBreaking = append(newBreaking, b)
		}
	}
	r.data.BreakingNews = newBreaking

	var newPinned []NewsCardDTO
	for _, p := range r.data.PinnedFeatured {
		if p.ID != id {
			newPinned = append(newPinned, p)
		}
	}
	r.data.PinnedFeatured = newPinned

	var newSmall []NewsCardDTO
	for _, s := range r.data.SmallNews {
		if s.ID != id {
			newSmall = append(newSmall, s)
		}
	}
	r.data.SmallNews = newSmall

	return r.store.Save(&r.data)
}

func (r *diskRepository) FindByID(ctx context.Context, id string) (*NewsCardDTO, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for i := range r.data.PinnedFeatured {
		if r.data.PinnedFeatured[i].ID == id {
			card := r.data.PinnedFeatured[i]
			return &card, nil
		}
	}
	for i := range r.data.SmallNews {
		if r.data.SmallNews[i].ID == id {
			card := r.data.SmallNews[i]
			return &card, nil
		}
	}
	return nil, errors.New("الخبر غير موجود أو تم حذفه")
}
