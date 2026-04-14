export interface User { id: number; email: string; role: string; status: string; }
export interface Venue { id: number; name: string; }
export interface News { id: number; title: string; content: string; is_active: boolean; created_at: string; image_url?: string; }
export interface Channel { id: number; name: string; price: number | string; color: string; }