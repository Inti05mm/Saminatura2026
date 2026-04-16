import leaf from "../pictures/leaf6.png";

const ShopNavbar = () => {
  return (
    <div className="relative w-full">
      
      {/* IMAGEN */}
      <img
        src={leaf}
        alt="Hero"
        className="w-full h-auto object-cover"
      />

      {/* TEXTO ENCIMA */}
      <div className="absolute inset-0 flex items-center justify-end px-60 pt-40">
        <div className="text-right max-w-md">
          <h1 className="text-9xl sm:text-8xl lg:text-7xl font-black leading-tight text-black drop-shadow-lg">
            Cuídate sin cambiar tu{" "}
            <span className="text-verde-2">
              rutina
            </span>
          </h1>

          <p className="mt-4 text-lg text-black drop-shadow-md">
            Explora nuestras categorías y encuentra lo que encaja contigo.
          </p>
        </div>
      </div>

    </div>
  );
};

export default ShopNavbar;
