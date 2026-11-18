package news

import "time"

type BreakingNewsDTO struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	PublishedAt time.Time `json:"published_at"`
}

type NewsCardDTO struct {
	ID                string    `json:"id"`
	Title             string    `json:"title"`
	Summary           string    `json:"summary"`
	CoverImageURL     string    `json:"cover_image_url,omitempty"`
	VideoStreamURL    string    `json:"video_stream_url,omitempty"`
	AuthorDisplayName string    `json:"author_display_name"`
	AuthorAvatarURL   string    `json:"author_avatar_url,omitempty"`
	AuthorIsVerified  bool      `json:"author_is_verified"`
	AuthorBadgeLabel  string    `json:"author_badge_label,omitempty"`
	PublishedAt       time.Time `json:"published_at"`
	ViewsCount        int64     `json:"views_count"`
	IsFeatured        bool      `json:"is_featured"`
	IsPinned          bool      `json:"is_pinned"`
	HasLongText       bool      `json:"has_long_text"`
	AspectRatio       float64   `json:"aspect_ratio,omitempty"`
}

type PublishNewsRequestDTO struct {
	Title             string  `json:"title"`
	Summary           string  `json:"summary"`
	CoverImageURL     string  `json:"cover_image_url"`
	VideoStreamURL    string  `json:"video_stream_url"`
	AuthorDisplayName string  `json:"author_display_name"`
	AuthorIsVerified  bool    `json:"author_is_verified"`
	AuthorBadgeLabel  string  `json:"author_badge_label"`
	IsBreaking        bool    `json:"is_breaking"`
	IsPinnedFeatured  bool    `json:"is_pinned_featured"`
	AspectRatio       float64 `json:"aspect_ratio,omitempty"`
}

type NewsFeedResponseDTO struct {
	BreakingNews   []BreakingNewsDTO `json:"breaking_news"`
	PinnedFeatured []NewsCardDTO     `json:"pinned_featured"`
	SmallNews      []NewsCardDTO     `json:"small_news"`
	NextCursor     string            `json:"next_cursor,omitempty"`
	HasMore        bool              `json:"has_more"`
}
