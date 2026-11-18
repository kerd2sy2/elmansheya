package ratings

import (
	"context"
	"fmt"
	"sync"
	"time"

	"elmansheya/go-api/internal/platform/database"
)

type Repository interface {
	ListRatings(ctx context.Context, craftsmanID string) ([]RatingDTO, error)
	SubmitRating(ctx context.Context, req SubmitRatingRequestDTO) (*RatingDTO, error)
}

type diskRepository struct {
	mu    sync.RWMutex
	store *database.PersistentFileStore
	items []RatingDTO
}

func NewRepository() Repository {
	repo := &diskRepository{
		store: database.NewPersistentFileStore("ratings.json"),
		items: []RatingDTO{},
	}
	_ = repo.store.Load(&repo.items)
	if repo.items == nil {
		repo.items = []RatingDTO{}
	}
	return repo
}

func (r *diskRepository) ListRatings(ctx context.Context, craftsmanID string) ([]RatingDTO, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var result []RatingDTO
	for _, item := range r.items {
		if craftsmanID == "" || item.CraftsmanID == craftsmanID {
			result = append(result, item)
		}
	}
	return result, nil
}

func (r *diskRepository) SubmitRating(ctx context.Context, req SubmitRatingRequestDTO) (*RatingDTO, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	stars := req.Stars
	if stars < 1 {
		stars = 1
	} else if stars > 5 {
		stars = 5
	}

	cleanFP := req.DeviceFingerprint
	cleanPhone := req.UserPhone

	// منع التكرار والتصويت المتعدد: إذا كان هذا الجهاز أو الهاتف قد قيّم هذا الصنايعي مسبقاً، نحدّث تقييمه فقط
	for i, item := range r.items {
		isSameCraftsman := item.CraftsmanID == req.CraftsmanID
		isSameDevice := cleanFP != "" && item.DeviceFingerprint == cleanFP
		isSamePhone := cleanPhone != "" && item.UserPhone == cleanPhone

		if isSameCraftsman && (isSameDevice || isSamePhone) {
			r.items[i].Stars = stars
			r.items[i].Comment = req.Comment
			r.items[i].UserName = req.UserName
			r.items[i].UpdatedAt = time.Now()
			if cleanFP != "" {
				r.items[i].DeviceFingerprint = cleanFP
			}
			_ = r.store.Save(&r.items)
			copyItem := r.items[i]
			return &copyItem, nil
		}
	}

	dto := RatingDTO{
		ID:                fmt.Sprintf("rat-%d", time.Now().UnixNano()),
		CraftsmanID:       req.CraftsmanID,
		Stars:             stars,
		Comment:           req.Comment,
		UserName:          req.UserName,
		UserPhone:         req.UserPhone,
		DeviceFingerprint: cleanFP,
		UpdatedAt:         time.Now(),
	}

	r.items = append([]RatingDTO{dto}, r.items...)
	if err := r.store.Save(&r.items); err != nil {
		return nil, err
	}
	return &dto, nil
}
