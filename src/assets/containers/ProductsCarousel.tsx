import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface Product {
  id: number;
  category: string;
  name: string;
  brand: string;
  price: string;
  oldPrice?: string;
  img: string;
}

interface ProductsCarouselProps {
  category: string;
  products: Product[];
}

const ProductsCarousel: React.FC<ProductsCarouselProps> = ({ category, products }) => {
  const navigate = useNavigate();
  const filteredProducts = products.filter(p => p.category === category);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [visibleSlides, setVisibleSlides] = useState(4);
  const [slidePercentage, setSlidePercentage] = useState(25);

  useEffect(() => {
    const updateVisibleSlides = () => {
      if (window.innerWidth < 768) {
        setVisibleSlides(1);
        setSlidePercentage(100);
      } else if (window.innerWidth < 1024) {
        setVisibleSlides(2);
        setSlidePercentage(50);
      } else {
        setVisibleSlides(4);
        setSlidePercentage(25);
      }
    };

    updateVisibleSlides();
    window.addEventListener("resize", updateVisibleSlides);
    return () => window.removeEventListener("resize", updateVisibleSlides);
  }, []);

  const next = () => {
    if (currentSlide < filteredProducts.length - visibleSlides + 1) {
      setCurrentSlide(prev => prev + 1);
    }
  };

  const prev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const goToCategory = () => {
    navigate(`/Shopping/${category.toLowerCase()}`);
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 relative gris">
      <h2 className="text-2xl font-bold text-center mb-6">{category}</h2>

      <div className="overflow-hidden relative">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentSlide * slidePercentage}%)` }}
        >
          {filteredProducts.map(product => (
            <div key={product.id} className="shrink-0 w-1/4 px-2 md:px-3">
              <div
                onClick={() => navigate(`/shopping/${product.id}`)}
                className="verde-1 shadow-md rounded-xl hover:scale-105 transition-transform cursor-pointer"
              >
                <img
                  src={product.img}
                  alt={product.name}
                  className="h-64 w-full object-cover rounded-t-xl"
                />

                <div className="px-4 py-3">
                  <span className="text-gray-400 text-xs uppercase">
                    {product.brand}
                  </span>
                  <p className="text-lg font-bold text-black truncate">
                    {product.name}
                  </p>

                  <div className="flex items-center mt-2">
                    <p className="text-md font-semibold">
                      {product.price}
                    </p>
                    {product.oldPrice && (
                      <del className="ml-2 text-sm text-gray-500">
                        {product.oldPrice}
                      </del>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* CARD EXTRA */}
          <div className="shrink-0 w-1/4 px-2 md:px-3">
            <div
              onClick={goToCategory}
              className="h-64 flex items-center justify-center bg-gray-200 shadow-md rounded-xl cursor-pointer hover:scale-105 transition-transform"
            >
              <span className="text-lg font-bold text-black">
                Descubre más
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* BOTONES */}
      <button
        onClick={prev}
        disabled={currentSlide === 0}
        className={`absolute top-1/2 -left-6 transform -translate-y-1/2 bg-gray-200 rounded-full w-10 h-10 shadow-md z-50 ${
          currentSlide === 0 && "opacity-50 cursor-not-allowed"
        }`}
      >
        ‹
      </button>

      <button
        onClick={next}
        disabled={currentSlide >= filteredProducts.length - visibleSlides + 1}
        className={`absolute top-1/2 -right-6 transform -translate-y-1/2 bg-gray-200 rounded-full w-10 h-10 shadow-md z-50 ${
          currentSlide >= filteredProducts.length - visibleSlides + 1 &&
          "opacity-50 cursor-not-allowed"
        }`}
      >
        ›
      </button>
    </div>
  );
};

export default ProductsCarousel;
