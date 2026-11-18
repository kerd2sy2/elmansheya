package services

import "time"

type ServiceCategoryDTO struct {
	ID          string `json:"id"`
	Slug        string `json:"slug"`
	NameAr      string `json:"name_ar"`
	IconName    string `json:"icon_name"`
	Description string `json:"description"`
	SortOrder   int    `json:"sort_order"`
}

type ServiceItemDTO struct {
	ID           string    `json:"id"`
	CategorySlug string    `json:"category_slug"`
	Title        string    `json:"title"`
	Description  string    `json:"description"`
	Phone        string    `json:"phone,omitempty"`
	WorkingHours string    `json:"working_hours,omitempty"`
	Address      string    `json:"address,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

type CreateServiceItemRequestDTO struct {
	CategorySlug string `json:"category_slug"`
	Title        string `json:"title"`
	Description  string `json:"description"`
	Phone        string `json:"phone,omitempty"`
	WorkingHours string `json:"working_hours,omitempty"`
	Address      string `json:"address,omitempty"`
}
