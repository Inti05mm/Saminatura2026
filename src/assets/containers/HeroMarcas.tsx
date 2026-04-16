import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

type Brand = {
  id: number;
  name: string;
  image: string;
};

const HeroMarcas: React.FC = () => {
  const navigate = useNavigate();

  const [offset, setOffset] = useState(0);
  const speed = 0.02;

  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ✅ Cargar marcas desde Supabase (con fallback + error visible)
  useEffect(() => {
    let cancelled = false;

    const mapRows = (rows: any[] | null): Brand[] =>
      (rows ?? [])
        .filter((r) => r && r.id != null && r.name && r.image_url)
        .map((r) => ({
          id: Number(r.id),
          name: String(r.name),
          image: String(r.image_url),
        }));

    const loadBrands = async () => {
      setLoading(true);
      setLoadError(null);

      // 1) Intento “ideal” (activas + orden)
      const q1 = await supabase
        .from("brands")
        .select("id, name, image_url, is_active, sort_order, created_at")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (cancelled) return;

      if (!q1.error) {
        const mapped = mapRows(q1.data as any[] | null);
        setBrands(mapped);
        setOffset(0);
        setLoading(false);
        return;
      }

      // 2) Fallback: por si la policy/columnas no dejan filtrar u ordenar
      console.error("Brands query (ideal) error:", q1.error);
      const q2 = await supabase.from("brands").select("id, name, image_url");

      if (cancelled) return;

      if (q2.error) {
        console.error("Brands query (fallback) error:", q2.error);
        setBrands([]);
        setLoadError(
          `No se pudieron cargar marcas. Error: ${q2.error.message} (code: ${q2.error.code ?? "?"})`
        );
        setLoading(false);
        return;
      }

      const mapped2 = mapRows(q2.data as any[] | null);
      setBrands(mapped2);
      setOffset(0);
      setLoading(false);

      // Si el fallback devolvió 0, probablemente es RLS/policy para anon
      if (mapped2.length === 0) {
        setLoadError(
          "No llegan marcas desde Supabase. Si en la tabla sí hay filas, casi seguro es RLS/policy para anon (lectura pública)."
        );
      }
    };

    loadBrands();

    return () => {
      cancelled = true;
    };
  }, []);

  // ✅ Animación (solo si hay algo que mover)
  useEffect(() => {
    if (brands.length === 0) return;

    let animationFrame: number;

    const animate = () => {
      setOffset((prev) => (prev <= -50 ? 0 : prev - speed));
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [brands.length]);

  const loopBrands = useMemo(() => {
    if (brands.length <= 6) return [...brands, ...brands, ...brands];
    return [...brands, ...brands];
  }, [brands]);

  return (
    <section className="w-full py-12 pb-16 overflow-hidden bg-white">
      <h2 className="text-2xl md:text-3xl font-bold text-center mb-10 text-gray-800">
        Descubre nuestras marcas
      </h2>

      {loading ? (
        <div className="text-center text-gray-500">Cargando marcas...</div>
      ) : brands.length === 0 ? (
        <div className="text-center text-gray-500 px-4">
          <p>Aún no hay marcas para mostrar.</p>
          {loadError && (
            <p className="mt-2 text-xs text-red-600 whitespace-pre-wrap">
              {loadError}
            </p>
          )}
        </div>
      ) : (
        <>
          {loadError && (
            <div className="text-center px-4 mb-4">
              <p className="text-xs text-amber-700 whitespace-pre-wrap">
                {loadError}
              </p>
            </div>
          )}

          <div className="relative w-full overflow-hidden pb-4 mx-10">
            <div
              className="flex gap-3"
              style={{
                transform: `translateX(${offset}%)`,
                width: "200%",
              }}
            >
              {loopBrands.map((brand, index) => (
                <button
                  key={`${brand.id}-${index}`}
                  type="button"
                  className="shrink-0 w-20 md:w-24 -mr-1 cursor-pointer"
                  title={brand.name}
                  aria-label={`Ver productos de la marca ${brand.name}`}
                  onClick={() => {
                    const params = new URLSearchParams({ brand: brand.name });
                    navigate(`/shopping?${params.toString()}`);
                  }}
                >
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full verde-3 shadow-md overflow-hidden flex items-center justify-center hover:scale-[1.03] active:scale-[0.99] transition-transform">
                    <img
                      src={brand.image}
                      alt={brand.name}
                      className="w-full h-full object-contain p-3"
                      loading="lazy"
                      onError={(e) => {
                        console.log("IMG ERROR:", brand.name, brand.image);
                        (e.currentTarget as HTMLImageElement).src =
                          "https://via.placeholder.com/150";
                      }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default HeroMarcas;
