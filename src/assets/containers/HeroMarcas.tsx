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

  useEffect(() => {
    let alive = true;

    const mapRows = (rows: any[] | null): Brand[] =>
      (rows ?? [])
        .filter(
          (row) =>
            row &&
            row.id != null &&
            row.name &&
            row.image_url
        )
        .map((row) => ({
          id: Number(row.id),
          name: String(row.name),
          image: String(row.image_url),
        }));

    const loadBrands = async () => {
      setLoading(true);
      setLoadError(null);

      try {
        /*
          Este is_active pertenece a la tabla brands.
          No tiene relación con isgood o is_discontinued de products.
        */
        const { data, error } = await supabase
          .from("brands")
          .select(
            "id, name, image_url, is_active, sort_order, created_at"
          )
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true });

        if (!alive) return;

        if (error) {
          console.error("Error cargando marcas:", error);

          setBrands([]);
          setLoadError(
            `No se pudieron cargar las marcas. ${error.message}`
          );
          return;
        }

        const mappedBrands = mapRows(data as any[] | null);

        setBrands(mappedBrands);
        setOffset(0);

        if (mappedBrands.length === 0) {
          setLoadError(
            "No hay marcas activas para mostrar."
          );
        }
      } catch (error: any) {
        if (!alive) return;

        console.error("Error inesperado cargando marcas:", error);

        setBrands([]);
        setLoadError(
          error?.message ??
            "Se produjo un error cargando las marcas."
        );
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    };

    void loadBrands();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (brands.length === 0) return;

    let animationFrame: number;

    const animate = () => {
      setOffset((previous) =>
        previous <= -50 ? 0 : previous - speed
      );

      animationFrame = window.requestAnimationFrame(animate);
    };

    animationFrame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [brands.length]);

  const loopBrands = useMemo(() => {
    if (brands.length <= 6) {
      return [...brands, ...brands, ...brands];
    }

    return [...brands, ...brands];
  }, [brands]);

  const openBrand = (brandName: string) => {
    const params = new URLSearchParams({
      brand: brandName,
    });

    navigate(`/shopping?${params.toString()}#products`);
  };

  return (
    <section className="w-full overflow-hidden bg-white py-12 pb-16">
      <h2 className="mb-10 text-center text-2xl font-bold text-gray-800 md:text-3xl">
        Descubre nuestras marcas
      </h2>

      {loading ? (
        <div className="text-center text-gray-500">
          Cargando marcas...
        </div>
      ) : brands.length === 0 ? (
        <div className="px-4 text-center text-gray-500">
          <p>Aún no hay marcas para mostrar.</p>

          {loadError && (
            <p className="mt-2 whitespace-pre-wrap text-xs text-red-600">
              {loadError}
            </p>
          )}
        </div>
      ) : (
        <>
          {loadError && (
            <div className="mb-4 px-4 text-center">
              <p className="whitespace-pre-wrap text-xs text-amber-700">
                {loadError}
              </p>
            </div>
          )}

          <div className="relative mx-10 w-full overflow-hidden pb-4">
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
                  className="-mr-1 w-20 shrink-0 cursor-pointer md:w-24"
                  title={brand.name}
                  aria-label={`Ver productos de la marca ${brand.name}`}
                  onClick={() => openBrand(brand.name)}
                >
                  <div className="verde-3 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full shadow-md transition-transform hover:scale-[1.03] active:scale-[0.99] md:h-24 md:w-24">
                    <img
                      src={brand.image}
                      alt={brand.name}
                      className="h-full w-full object-contain p-3"
                      loading="lazy"
                      onError={(event) => {
                        console.error(
                          "Error cargando imagen de marca:",
                          brand.name,
                          brand.image
                        );

                        event.currentTarget.src =
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