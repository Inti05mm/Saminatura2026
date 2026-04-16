import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";

import Header from "../containers/Header";
import ProductDetail from "../containers/ProductDetail";
import RelatedProducts from "../containers/RelatedProducts";
import RelatedProductsByBrand from "../containers/RelatedBrand";
import Footer from "../containers/Footer.tsx";

type Product = {
  id: number;
  category: string;
  brand: string;
};

export default function ProdDetPage() {
  const { slug } = useParams<{ slug: string }>();

  const productId = useMemo(() => {
    if (!slug) return NaN;
    if (/^\d+$/.test(slug)) return Number(slug);
    const last = slug.split("-").pop();
    return Number(last);
  }, [slug]);

  const [product, setProduct] = useState<Product | null>(null);
  const [loadingPage, setLoadingPage] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ✅ FORZAR ARRIBA AL ENTRAR / CAMBIAR PRODUCTO
  useEffect(() => {
    // “instantáneo” para que no haga un salto raro durante la carga
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [slug]); // o [productId]

  useEffect(() => {
    let alive = true;

    const fetchMini = async () => {
      setLoadingPage(true);
      setErrorMsg(null);

      if (!Number.isFinite(productId)) {
        setErrorMsg("ID inválido");
        setProduct(null);
        setLoadingPage(false);
        return;
      }

      const { data, error } = await supabase
        .from("public_products")
        .select("id, category, brand")
        .eq("id", productId)
        .single();

      if (!alive) return;

      if (error) {
        setErrorMsg(error.message);
        setProduct(null);
        setLoadingPage(false);
        return;
      }

      setProduct({
        id: Number(data.id),
        category: data.category ?? "",
        brand: data.brand ?? "",
      });

      setLoadingPage(false);
    };

    fetchMini();
    return () => {
      alive = false;
    };
  }, [productId]);

  return (
    <main className="min-h-screen gris ">
      <Header />
      <ProductDetail />

      {loadingPage ? (
        <div className="max-w-6xl mx-auto mt-8">
          <p className="text-gray-600">Cargando relacionados…</p>
        </div>
      ) : errorMsg || !product ? null : (
        <>
          <RelatedProducts category={product.category} currentProductId={product.id} />
          <RelatedProductsByBrand brand={product.brand} currentProductId={product.id} />
        </>
      )}
      <div className= "pt-8">
      <Footer/>
      </div>
    </main>
  );
}
