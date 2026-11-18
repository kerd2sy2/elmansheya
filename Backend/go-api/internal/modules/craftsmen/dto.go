package craftsmen

type CategoryDTO struct {
	ID       string `json:"id"`
	Slug     string `json:"slug"`
	NameAr   string `json:"name_ar"`
	IconName string `json:"icon_name"`
}

type CraftsmanWorkDTO struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	ImageURL    string `json:"image_url"`
	Description string `json:"description,omitempty"`
}

type CraftsmanCardDTO struct {
	ID                  string             `json:"id"`
	FullName            string             `json:"full_name"`
	Nickname            string             `json:"nickname"`
	Specialty           string             `json:"specialty"`
	Phone               string             `json:"phone"`
	Area                string             `json:"area"`
	AvatarURL           string             `json:"avatar_url,omitempty"`
	ServicesDescription string             `json:"services_description"`
	IsAccredited        bool               `json:"is_accredited"`
	AverageRating       float64            `json:"average_rating"`
	RatingsCount        int                `json:"ratings_count"`
	Portfolio           []CraftsmanWorkDTO `json:"portfolio,omitempty"`
}

type CreateCraftsmanRequestDTO struct {
	FullName            string `json:"full_name"`
	Nickname            string `json:"nickname"`
	Specialty           string `json:"specialty"`
	Phone               string `json:"phone"`
	Area                string `json:"area"`
	ServicesDescription string `json:"services_description"`
}
