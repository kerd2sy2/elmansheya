export interface BreakingNewsItem {
  id: string;
  title: string;
  published_at: string;
}

export interface NewsCardItem {
  id: string;
  title: string;
  summary: string;
  cover_image_url?: string;
  video_stream_url?: string;
  author_display_name: string;
  author_avatar_url?: string;
  author_is_verified?: boolean;
  author_badge_label?: string;
  published_at: string;
  views_count: number;
  is_featured: boolean;
  is_pinned: boolean;
  has_long_text: boolean;
  aspect_ratio?: number;
}

export interface NewsFeedPayload {
  breaking_news: BreakingNewsItem[];
  pinned_featured: NewsCardItem[];
  small_news: NewsCardItem[];
  next_cursor?: string;
  has_more: boolean;
}
