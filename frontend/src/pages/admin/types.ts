export interface User { id: string; email: string; role: string; status: string; }
export interface Venue { id: string; name: string; }
export interface News { id: string; title: string; content: string; is_active: boolean; created_at: string; image_url?: string; }
export interface Channel { id: string; name: string; price: number | string; color: string; }
export interface CarouselItem { id: string; image_url: string; link_url: string; is_active: boolean; sort_order: number; }