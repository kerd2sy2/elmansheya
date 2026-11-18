export interface ServiceSubCategory {
  id: string;
  slug: string;
  name_ar: string;
  icon: string;
  description: string;
}

export interface ServiceCategoryItem {
  id: string;
  slug: string;
  name_ar: string;
  icon: string;
  description: string;
  subcategories: ServiceSubCategory[];
}

export interface ServiceDetailItem {
  id: string;
  category_slug: string;
  subcategory_slug?: string;
  title: string;
  description: string;
  phone?: string;
  working_hours?: string;
  address?: string;
  created_at?: string;
}
