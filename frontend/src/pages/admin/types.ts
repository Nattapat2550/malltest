export interface User { id: number; email: string; role: string; status: string; }
export interface Venue { id: number; name: string; }
export interface News { id: number; title: string; content: string; is_active: boolean; created_at: string; image_url?: string; }
export interface Channel { id: number; name: string; price: number | string; color: string; }
export interface CarouselItem { id: number; image_url: string; link_url: string; is_active: boolean; sort_order: number;
}