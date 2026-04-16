export type PromoType = "none" | "percent" | "2x1" | "3x2" | "second_half";

export type Product = {
  id: number;
  category: string;
  name: string;
  brand: string;

  price: number;
  old_price: number | null;

  purchase_price: number | null;
  vat_rate: number;
  recargo_rate: number;

  promo_type: PromoType;
  promo_active: boolean;

  img: string | null;
  description: string | null;

  stock: number | null;

  bio: boolean;
  vegan: boolean;

  gluten_free: boolean;
  lactose_free: boolean;
  supplier_name: string | null;

  expiration_date: string | null;
  slug: string | null;

  flavor: string | null;
  size: string | null;
};