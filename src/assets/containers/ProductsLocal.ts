// productsData.ts
export interface Product {
  id: number;
  category: string;
  name: string;
  brand: string;
  price: number;       // 👈 número REAL
  oldPrice?: number;   // 👈 número REAL
  img: string;
}



export const products: Product[] = [
  // Belleza
  { id: 1, category: "Belleza", name: "Serum Facial", brand: "BeautyCo", price: 49, oldPrice: 59, img: "https://images.pexels.com/photos/27768697/pexels-photo-27768697.jpeg" },
  { id: 2, category: "Belleza", name: "Crema Hidratante", brand: "GlowUp", price: 39, oldPrice: 49, img: "https://images.unsplash.com/photo-1612817150821-1c9e1eeb14e8?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
  { id: 3, category: "Belleza", name: "Labial Mate", brand: "ColorMe", price: 19, oldPrice: 25, img: "https://images.unsplash.com/photo-1612817150822-2fcd951fc9b1?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
  { id: 4, category: "Belleza", name: "Mascarilla Facial", brand: "SkinCare", price: 29, oldPrice: 35, img: "https://images.unsplash.com/photo-1612817150823-4a6b07fa5f0b?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
  { id: 5, category: "Belleza", name: "Perfume Floral", brand: "Scentify", price: 69, oldPrice: 79, img: "https://images.unsplash.com/photo-1612817150824-5d8f0e5b7f01?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
  { id: 6, category: "Belleza", name: "Crema Antiarrugas", brand: "YouthSkin", price: 59, oldPrice: 69, img: "https://images.unsplash.com/photo-1612817150825-6a7b0e4c2f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
  { id: 7, category: "Belleza", name: "Exfoliante Facial", brand: "FreshFace", price: 25, oldPrice: 30, img: "https://images.unsplash.com/photo-1612817150826-7f8d0f1c3e5e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
  { id: 8, category: "Belleza", name: "Aceite Corporal", brand: "GlowBody", price: 35, oldPrice: 45, img: "https://images.unsplash.com/photo-1612817150827-8d9f1f2b4c3e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },

  // Deporte
  { id: 9, category: "Deporte", name: "Zapatillas Running", brand: "RunFast", price: 89, oldPrice: 99, img: "https://images.unsplash.com/photo-1600185366205-9d9c3c7f9a12?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
  { id: 10, category: "Deporte", name: "Camiseta Deportiva", brand: "ActiveWear", price: 29, oldPrice: 39, img: "https://images.unsplash.com/photo-1600185366206-0a9c3c7f9b23?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
  { id: 11, category: "Deporte", name: "Malla Running", brand: "SpeedFit", price: 49, oldPrice: 59, img: "https://images.unsplash.com/photo-1600185366207-1b9d3c8f1a34?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
  { id: 12, category: "Deporte", name: "Balón Fútbol", brand: "ProBall", price: 25, oldPrice: 35, img: "https://images.unsplash.com/photo-1600185366208-2c9e4c9f2b45?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
  { id: 13, category: "Deporte", name: "Guantes Fitness", brand: "GripMax", price: 19, oldPrice: 25, img: "https://images.unsplash.com/photo-1600185366209-3d0f5c0f3c56?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
  { id: 14, category: "Deporte", name: "Cuerda Salto", brand: "JumpPro", price: 15, oldPrice: 20, img: "https://images.unsplash.com/photo-1600185366210-4e1f6c1f4d67?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
  { id: 15, category: "Deporte", name: "Bandas Elásticas", brand: "StretchIt", price: 12, oldPrice: 18, img: "https://images.unsplash.com/photo-1600185366211-5f2g7c2f5e78?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
  { id: 16, category: "Deporte", name: "Mochila Deportiva", brand: "CarryFit", price: 49, oldPrice: 59, img: "https://images.unsplash.com/photo-1600185366212-6g3h8d3f6f89?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },

  // Suplementos

{ id: 17, category: "Suplementos", name: "Proteína Whey", brand: "NutriPro", price: 39, oldPrice: 49, img: "https://images.unsplash.com/photo-1612345678901-1a2b3c4d5e6f?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 18, category: "Suplementos", name: "BCAA", brand: "MuscleUp", price: 25, oldPrice: 35, img: "https://images.unsplash.com/photo-1612345678902-2b3c4d5e6f7a?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 19, category: "Suplementos", name: "Creatina", brand: "PowerBuild", price: 29, oldPrice: 39, img: "https://images.unsplash.com/photo-1612345678903-3c4d5e6f7a8b?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 20, category: "Suplementos", name: "Omega 3", brand: "HealthPlus", price: 19, oldPrice: 25, img: "https://images.unsplash.com/photo-1612345678904-4d5e6f7a8b9c?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 21, category: "Suplementos", name: "Multivitamínico", brand: "VitaBoost", price: 29, oldPrice: 35, img: "https://images.unsplash.com/photo-1612345678905-5e6f7a8b9c0d?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 22, category: "Suplementos", name: "Glutamina", brand: "RecoveryPlus", price: 24, oldPrice: 30, img: "https://images.unsplash.com/photo-1612345678906-6f7a8b9c0d1e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 23, category: "Suplementos", name: "Pre-Workout", brand: "EnergyFit", price: 29, oldPrice: 39, img: "https://images.unsplash.com/photo-1612345678907-7a8b9c0d1e2f?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 24, category: "Suplementos", name: "Vitaminas D", brand: "SunHealth", price: 19, oldPrice: 25, img: "https://images.unsplash.com/photo-1612345678908-8b9c0d1e2f3g?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },

  // Aromaterapia

{ id: 25, category: "Aromaterapia", name: "Aceite Esencial Lavanda", brand: "AromaZen", price: 12, oldPrice: 15, img: "https://images.unsplash.com/photo-1612345678909-9c0d1e2f3g4h?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 26, category: "Aromaterapia", name: "Difusor Eléctrico", brand: "ZenHome", price: 29, oldPrice: 35, img: "https://images.unsplash.com/photo-1612345678910-0d1e2f3g4h5i?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 27, category: "Aromaterapia", name: "Vela Aromática", brand: "ScentLife", price: 15, oldPrice: 20, img: "https://images.unsplash.com/photo-1612345678911-1e2f3g4h5i6j?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 28, category: "Aromaterapia", name: "Spray Ambiente", brand: "FreshAir", price: 12, oldPrice: 15, img: "https://images.unsplash.com/photo-1612345678912-2f3g4h5i6j7k?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 29, category: "Aromaterapia", name: "Aceite Esencial Eucalipto", brand: "AromaZen", price: 12, oldPrice: 15, img: "https://images.unsplash.com/photo-1612345678913-3g4h5i6j7k8l?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 30, category: "Aromaterapia", name: "Difusor de Mesa", brand: "ZenHome", price: 35, oldPrice: 40, img: "https://images.unsplash.com/photo-1612345678914-4h5i6j7k8l9m?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 31, category: "Aromaterapia", name: "Vela Relax", brand: "ScentLife", price: 18, oldPrice: 22, img: "https://images.unsplash.com/photo-1612345678915-5i6j7k8l9m0n?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 32, category: "Aromaterapia", name: "Spray Energizante", brand: "FreshAir", price: 12, oldPrice: 15, img: "https://images.unsplash.com/photo-1612345678916-6j7k8l9m0n1o?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },

  // Cosmetica e Higiene
// Cosmetica e Higiene
{ id: 33, category: "Cosmetica e Higiene", name: "Champú Suave", brand: "HairCare", price: 9, oldPrice: 12, img: "https://images.unsplash.com/photo-1612345678917-7k8l9m0n1o2p?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 34, category: "Cosmetica e Higiene", name: "Jabón Natural", brand: "PureSoap", price: 5, oldPrice: 7, img: "https://images.unsplash.com/photo-1612345678918-8l9m0n1o2p3q?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 35, category: "Cosmetica e Higiene", name: "Pasta Dental", brand: "SmileBright", price: 3, oldPrice: 5, img: "https://images.unsplash.com/photo-1612345678919-9m0n1o2p3q4r?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 36, category: "Cosmetica e Higiene", name: "Desodorante Roll-On", brand: "FreshMove", price: 4, oldPrice: 6, img: "https://images.unsplash.com/photo-1612345678920-0n1o2p3q4r5s?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 37, category: "Cosmetica e Higiene", name: "Crema de Manos", brand: "SoftHands", price: 6, oldPrice: 8, img: "https://images.unsplash.com/photo-1612345678921-1o2p3q4r5s6t?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 38, category: "Cosmetica e Higiene", name: "Toallitas Húmedas", brand: "CleanWipes", price: 5, oldPrice: 7, img: "https://images.unsplash.com/photo-1612345678922-2p3q4r5s6t7u?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 39, category: "Cosmetica e Higiene", name: "Cepillo Dental", brand: "SmileBright", price: 3, oldPrice: 4, img: "https://images.unsplash.com/photo-1612345678923-3q4r5s6t7u8v?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 40, category: "Cosmetica e Higiene", name: "Gel de Baño", brand: "FreshBody", price: 7, oldPrice: 9, img: "https://images.unsplash.com/photo-1612345678924-4r5s6t7u8v9w?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },

  // SinGluten
// SinGluten
{ id: 41, category: "SinGluten", name: "Pan Integral", brand: "GlutenFreeCo", price: 5, oldPrice: 6, img: "https://images.unsplash.com/photo-1604908177522-2a8f1d3a1b5d?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 42, category: "SinGluten", name: "Galletas de Avena", brand: "FreeBakery", price: 3, oldPrice: 4, img: "https://images.unsplash.com/photo-1604908177523-3b9f2d4b1c6e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 43, category: "SinGluten", name: "Pasta Sin Gluten", brand: "GlutenLess", price: 4, oldPrice: 5, img: "https://images.unsplash.com/photo-1604908177524-4caf3e5c2d7f?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 44, category: "SinGluten", name: "Harina de Almendra", brand: "AlmondBake", price: 6, oldPrice: 7, img: "https://images.unsplash.com/photo-1604908177525-5daf4f6d3e80?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 45, category: "SinGluten", name: "Snack de Maíz", brand: "CornyFree", price: 2, oldPrice: 3, img: "https://images.unsplash.com/photo-1604908177526-6ebf5g7f4f91?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 46, category: "SinGluten", name: "Tortillas de Maíz", brand: "FreeTortilla", price: 3, oldPrice: 4, img: "https://images.unsplash.com/photo-1604908177527-7fcg6h8g5g02?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 47, category: "SinGluten", name: "Bizcocho Sin Gluten", brand: "SweetFree", price: 5, oldPrice: 6, img: "https://images.unsplash.com/photo-1604908177528-8gdg7i9h6h13?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 48, category: "SinGluten", name: "Pan de Molde", brand: "GlutenFreeCo", price: 4, oldPrice: 5, img: "https://images.unsplash.com/photo-1604908177529-9heh8j0i7i24?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },

// Alimentos
// Alimentos
{ id: 49, category: "Alimentos", name: "Arroz Integral", brand: "NutriFood", price: 3, oldPrice: 4, img: "https://images.unsplash.com/photo-1589987949808-b3f3b77c6f1e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 50, category: "Alimentos", name: "Aceite de Oliva", brand: "OliveGold", price: 7, oldPrice: 9, img: "https://images.unsplash.com/photo-1589987949809-c4f4c88d7f2f?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 51, category: "Alimentos", name: "Tomate Triturado", brand: "PureTaste", price: 2, oldPrice: 3, img: "https://images.unsplash.com/photo-1589987949810-d5f5d99e8f3f?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 52, category: "Alimentos", name: "Legumbres Variadas", brand: "BeanCo", price: 4, oldPrice: 5, img: "https://images.unsplash.com/photo-1589987949811-e6f6ea9f9f4f?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 53, category: "Alimentos", name: "Harina de Trigo", brand: "BakeWell", price: 3, oldPrice: 4, img: "https://images.unsplash.com/photo-1589987949812-f7f7fb0a0f5f?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 54, category: "Alimentos", name: "Azúcar Morena", brand: "SweetNature", price: 2, oldPrice: 3, img: "https://images.unsplash.com/photo-1589987949813-g8g8gc1b1g6g?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 55, category: "Alimentos", name: "Café Molido", brand: "CoffeeBean", price: 5, oldPrice: 6, img: "https://images.unsplash.com/photo-1589987949814-h9h9hd2c2h7h?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 56, category: "Alimentos", name: "Leche UHT", brand: "MilkCo", price: 1.5, oldPrice: 2, img: "https://images.unsplash.com/photo-1589987949815-i1i1ie3d3i8i?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },

// Hogar
// Hogar
{ id: 57, category: "Hogar", name: "Detergente Líquido", brand: "CleanHome", price: 4, oldPrice: 5, img: "https://images.unsplash.com/photo-1589987949816-j2j2jf4e4j9j?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 58, category: "Hogar", name: "Limpiador Multiusos", brand: "ShinyHome", price: 3, oldPrice: 4, img: "https://images.unsplash.com/photo-1589987949817-k3k3kg5f5k0k?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 59, category: "Hogar", name: "Esponja de Cocina", brand: "ScrubIt", price: 1, oldPrice: 1.5, img: "https://images.unsplash.com/photo-1589987949818-l4l4lh6g6l1l?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 60, category: "Hogar", name: "Toallas de Cocina", brand: "SoftHome", price: 2, oldPrice: 3, img: "https://images.unsplash.com/photo-1589987949819-m5m5mi7h7m2m?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 61, category: "Hogar", name: "Vela Decorativa", brand: "LightUp", price: 5, oldPrice: 6, img: "https://images.unsplash.com/photo-1589987949820-n6n6nj8i8n3n?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 62, category: "Hogar", name: "Juego de Sábanas", brand: "DreamHome", price: 25, oldPrice: 30, img: "https://images.unsplash.com/photo-1589987949821-o7o7ok9j9o4o?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 63, category: "Hogar", name: "Cojín Decorativo", brand: "ComfyHome", price: 10, oldPrice: 12, img: "https://images.unsplash.com/photo-1589987949822-p8p8pl0k0p5p?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 64, category: "Hogar", name: "Organizador Cajones", brand: "TidyHome", price: 8, oldPrice: 10, img: "https://images.unsplash.com/photo-1589987949823-q9q9qm1l1q6q?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },

// Granel
// Granel
{ id: 65, category: "Granel", name: "Lentejas", brand: "BeanBulk", price: 2, oldPrice: 3, img: "https://images.unsplash.com/photo-1603072182874-3c18ef9e5f4a?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 66, category: "Granel", name: "Arroz", brand: "RiceBulk", price: 1.5, oldPrice: 2, img: "https://images.unsplash.com/photo-1603072182875-4d29ff0f6g5b?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 67, category: "Granel", name: "Frijoles Negros", brand: "BeanBulk", price: 2.5, oldPrice: 3, img: "https://images.unsplash.com/photo-1603072182876-5e3ag1g7h6c?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 68, category: "Granel", name: "Azúcar", brand: "SweetBulk", price: 1.5, oldPrice: 2, img: "https://images.unsplash.com/photo-1603072182877-6f4bh2h8i7d?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 69, category: "Granel", name: "Sal Marina", brand: "SeaBulk", price: 1, oldPrice: 1.5, img: "https://images.unsplash.com/photo-1603072182878-7g5ci3i9j8e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 70, category: "Granel", name: "Harina", brand: "BakeBulk", price: 2, oldPrice: 3, img: "https://images.unsplash.com/photo-1603072182879-8h6dj4j0k9f?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 71, category: "Granel", name: "Avena", brand: "OatBulk", price: 2.5, oldPrice: 3, img: "https://images.unsplash.com/photo-1603072182880-9i7ek5k1l0g?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
{ id: 72, category: "Granel", name: "Maíz", brand: "CornBulk", price: 2, oldPrice: 3, img: "https://images.unsplash.com/photo-1603072182881-0j8fl6l2m1h?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },



];