package craftsmen

import (
	"context"
	"fmt"
	"sort"
	"sync"
	"time"

	"elmansheya/go-api/internal/platform/database"
)

type Repository interface {
	ListCategories(ctx context.Context) ([]CategoryDTO, error)
	SearchCraftsmen(ctx context.Context) ([]CraftsmanCardDTO, error)
	CreateCraftsman(ctx context.Context, req CreateCraftsmanRequestDTO) (*CraftsmanCardDTO, error)
	AddRating(ctx context.Context, craftsmanID string, stars int) error
}

type diskRepository struct {
	mu    sync.RWMutex
	store *database.PersistentFileStore
	items []CraftsmanCardDTO
}

func NewRepository() Repository {
	repo := &diskRepository{
		store: database.NewPersistentFileStore("craftsmen.json"),
		items: []CraftsmanCardDTO{},
	}
	_ = repo.store.Load(&repo.items)
	if repo.items == nil {
		repo.items = []CraftsmanCardDTO{}
	}
	return repo
}

func (r *diskRepository) ListCategories(ctx context.Context) ([]CategoryDTO, error) {
	return []CategoryDTO{
		{ID: "cat-1", Slug: "electricity", NameAr: "كهرباء منازل", IconName: "flash-outline"},
		{ID: "cat-2", Slug: "plumbing", NameAr: "سباكة وصحي", IconName: "water-outline"},
		{ID: "cat-3", Slug: "carpentry", NameAr: "نجارة خشب", IconName: "hammer-outline"},
		{ID: "cat-4", Slug: "painting", NameAr: "نقاشة ودهانات", IconName: "color-palette-outline"},
		{ID: "cat-5", Slug: "masonry", NameAr: "بناء ومحارة", IconName: "layers-outline"},
		{ID: "cat-6", Slug: "ceramics", NameAr: "سيراميك وبلاط", IconName: "grid-outline"},
		{ID: "cat-7", Slug: "blacksmith", NameAr: "حدادة وكريتال", IconName: "shield-outline"},
		{ID: "cat-8", Slug: "alumetal", NameAr: "ألوميتال وزجاج", IconName: "browsers-outline"},
		{ID: "cat-9", Slug: "gypsum", NameAr: "جبس بورد", IconName: "sparkles-outline"},
		{ID: "cat-10", Slug: "appliances", NameAr: "أجهزة منزلية", IconName: "construct-outline"},
		{ID: "cat-11", Slug: "hvac", NameAr: "تكييف وتبريد", IconName: "snow-outline"},
		{ID: "cat-12", Slug: "satellite_cctv", NameAr: "دش وكاميرات", IconName: "videocam-outline"},
		{ID: "cat-13", Slug: "water_filters", NameAr: "فلاتر مياه", IconName: "filter-outline"},
		{ID: "cat-14", Slug: "marble", NameAr: "رخام وجرانيت", IconName: "cube-outline"},
		{ID: "cat-15", Slug: "wood_painting", NameAr: "استورجي أخشاب", IconName: "brush-outline"},
		{ID: "cat-16", Slug: "upholstery", NameAr: "تنجيد وستائر", IconName: "bed-outline"},
		{ID: "cat-17", Slug: "reinforced_carpentry", NameAr: "نجارة مسلح", IconName: "business-outline"},
		{ID: "cat-18", Slug: "auto_mechanic", NameAr: "ميكانيكا سيارات", IconName: "car-sport-outline"},
		{ID: "cat-19", Slug: "auto_electric", NameAr: "كهرباء سيارات", IconName: "battery-charging-outline"},
		{ID: "cat-20", Slug: "welding_lathe", NameAr: "خراطة ولحام", IconName: "cog-outline"},
		{ID: "cat-21", Slug: "agri_machinery", NameAr: "ماكينات زراعية", IconName: "leaf-outline"},
		{ID: "cat-22", Slug: "solar_pumps", NameAr: "طاقة شمسية", IconName: "sunny-outline"},
		{ID: "cat-23", Slug: "mobile_pc", NameAr: "موبايل وكمبيوتر", IconName: "phone-portrait-outline"},
		{ID: "cat-24", Slug: "tailoring", NameAr: "خياطة وتفصيل", IconName: "cut-outline"},
		{ID: "cat-25", Slug: "barber", NameAr: "حلاقة ورجالي", IconName: "person-outline"},
		{ID: "cat-26", Slug: "bakery_oven", NameAr: "أفران وبوتاجازات", IconName: "flame-outline"},
		{ID: "cat-27", Slug: "moving_labor", NameAr: "نقل عفش", IconName: "bus-outline"},
		{ID: "cat-28", Slug: "insulation", NameAr: "عزل أسطح", IconName: "umbrella-outline"},
		{ID: "cat-29", Slug: "pest_cleaning", NameAr: "مكافحة حشرات", IconName: "shield-checkmark-outline"},
		{ID: "cat-30", Slug: "sound_lighting", NameAr: "فراشة ومناسبات", IconName: "volume-high-outline"},
	}, nil
}

func (r *diskRepository) SearchCraftsmen(ctx context.Context) ([]CraftsmanCardDTO, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	out := make([]CraftsmanCardDTO, len(r.items))
	copy(out, r.items)

	// ترتيب حسب الأعلى تقييماً أولاً طبقاً للبند 4.5
	sort.Slice(out, func(i, j int) bool {
		return out[i].AverageRating > out[j].AverageRating
	})
	return out, nil
}

func (r *diskRepository) CreateCraftsman(ctx context.Context, req CreateCraftsmanRequestDTO) (*CraftsmanCardDTO, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	card := CraftsmanCardDTO{
		ID:                  fmt.Sprintf("cr-%d", time.Now().UnixNano()),
		FullName:            req.FullName,
		Nickname:            req.Nickname,
		Specialty:           req.Specialty,
		Phone:               req.Phone,
		Area:                req.Area,
		ServicesDescription: req.ServicesDescription,
		IsAccredited:        true,
		AverageRating:       5.0,
		RatingsCount:        1,
	}

	r.items = append([]CraftsmanCardDTO{card}, r.items...)
	if err := r.store.Save(&r.items); err != nil {
		return nil, err
	}
	return &card, nil
}

func (r *diskRepository) AddRating(ctx context.Context, craftsmanID string, stars int) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	for i := range r.items {
		if r.items[i].ID == craftsmanID {
			totalStars := r.items[i].AverageRating * float64(r.items[i].RatingsCount)
			r.items[i].RatingsCount++
			totalStars += float64(stars)
			r.items[i].AverageRating = totalStars / float64(r.items[i].RatingsCount)
			return r.store.Save(&r.items)
		}
	}
	return fmt.Errorf("craftsman not found")
}
