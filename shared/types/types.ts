export interface OutlineItem {
  text: string;
  xmlUrl?: string;
  htmlUrl?: string;
  description?: string;
  children: OutlineItem[];
}

/**
 * Readwise document object returned from export API
 */
export interface ReadwiseDocument {
  id: string;
  url: string;
  source_url: string;
  title: string;
  author: string;
  source: string;
  category: string;
  location: string;
  tags: Record<string, unknown>;
  site_name: string;
  word_count: number;
  created_at: string;
  updated_at: string;
  notes: string;
  published_date: string;
  summary: string;
  image_url?: string;
  parent_id?: string | null;
  reading_progress: number;
  first_opened_at?: string | null;
  last_opened_at?: string | null;
  saved_at: string;
  last_moved_at: string;
}
