package services

import (
	"context"
	"fmt"
	"sync"
	"time"

	"elmansheya/go-api/internal/platform/database"
)

type Repository interface {
	ListMainCategories(ctx context.Context) ([]ServiceCategoryDTO, error)
	ListItemsByCategory(ctx context.Context, categorySlug string) ([]ServiceItemDTO, error)
	CreateServiceItem(ctx context.Context, req CreateServiceItemRequestDTO) (*ServiceItemDTO, error)
}

type diskRepository struct {
	mu    sync.RWMutex
	store *database.PersistentFileStore
	items []ServiceItemDTO
}

func NewRepository() Repository {
	repo := &diskRepository{
		store: database.NewPersistentFileStore("services_data.json"),
		items: []ServiceItemDTO{},
	}
	_ = repo.store.Load(&repo.items)
	if repo.items == nil {
		repo.items = []ServiceItemDTO{}
	}
	return repo
}

func (r *diskRepository) ListMainCategories(ctx context.Context) ([]ServiceCategoryDTO, error) {
	return []ServiceCategoryDTO{
		{ID: "srv-1", Slug: "events", NameAr: "المناسبات", IconName: "calendar-outline", Description: "الأفراح، العزاء، والفعاليات العامة بالقرية", SortOrder: 1},
		{ID: "srv-2", Slug: "humanitarian", NameAr: "الحالات الإنسانية", IconName: "heart-outline", Description: "الحالات الإنسانية والتبرعات الموثقة", SortOrder: 2},
		{ID: "srv-3", Slug: "healthcare", NameAr: "الصحة والطوارئ والصيدليات", IconName: "medkit-outline", Description: "الوحدة الصحية، الأطباء، الإسعاف، والصيدليات المناوبة", SortOrder: 3},
		{ID: "srv-4", Slug: "village_issues", NameAr: "خدمات ومشاكل القرية", IconName: "megaphone-outline", Description: "تقديم ومتابعة بلاغات ومشكلات القرية", SortOrder: 4},
		{ID: "srv-5", Slug: "transportation", NameAr: "المواصلات والسيارات", IconName: "car-outline", Description: "مواقف السيارات، الخطوط، وأرقام السائقين", SortOrder: 5},
		{ID: "srv-6", Slug: "education", NameAr: "المدارس والتعليم", IconName: "school-outline", Description: "المدارس، المعاهد الأزهرية، والحضانات", SortOrder: 6},
		{ID: "srv-7", Slug: "mosques_charities", NameAr: "المساجد والجمعيات", IconName: "home-outline", Description: "المساجد، الجمعيات الخيرية، ومكاتب التحفيظ", SortOrder: 7},
		{ID: "srv-8", Slug: "gov_offices", NameAr: "المصالح الحكومية والبريد", IconName: "business-outline", Description: "البريد، الوحدة المحلية، التموين، والجمعية الزراعية", SortOrder: 8},
		{ID: "srv-9", Slug: "shops_markets", NameAr: "المحلات والأسواق", IconName: "cart-outline", Description: "دليل المحلات التجارية والمخابز والأسواق", SortOrder: 9},
	}, nil
}

func (r *diskRepository) ListItemsByCategory(ctx context.Context, categorySlug string) ([]ServiceItemDTO, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	out := make([]ServiceItemDTO, 0)
	for _, item := range r.items {
		if categorySlug == "" || item.CategorySlug == categorySlug {
			out = append(out, item)
		}
	}
	return out, nil
}

func (r *diskRepository) CreateServiceItem(ctx context.Context, req CreateServiceItemRequestDTO) (*ServiceItemDTO, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()
	item := ServiceItemDTO{
		ID:           fmt.Sprintf("srv-item-%d", now.UnixNano()),
		CategorySlug: req.CategorySlug,
		Title:        req.Title,
		Description:  req.Description,
		Phone:        req.Phone,
		WorkingHours: req.WorkingHours,
		Address:      req.Address,
		CreatedAt:    now,
	}

	r.items = append([]ServiceItemDTO{item}, r.items...)
	if err := r.store.Save(&r.items); err != nil {
		return nil, err
	}
	return &item, nil
}
