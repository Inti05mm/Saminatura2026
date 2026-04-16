export default function Footer() {
  return (
    <footer className="gris text-white py-8">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Col 1 */}
        <div>
          
          <img
              src="https://uayblnybdrhhmumudbea.supabase.co/storage/v1/object/public/publicPictures/logo_2.png"
              alt="Saminatura"
              className="h-12 md:h-16 w-auto object-contain"
            />
          
          <p className="text-sm">
            Calidad natural para tu día a día.
          </p>
        </div>

        {/* Col 2 (ANTES Quick Links) -> Nuestras redes */}
      <div>
  <h4 className="font-bold mb-4">Nuestras redes</h4>

  <ul className="flex items-center gap-4">
    {/* Facebook */}
    <li>
      <a
        href="https://www.facebook.com/profile.php?id=61565024320802"
        aria-label="Facebook"
        className="
          group inline-flex items-center justify-center
          w-[50px] h-[50px] rounded-full
          bg-white shadow-[0_10px_10px_rgba(0,0,0,0.1)]
          transition-transform duration-200
          hover:-translate-y-[3px]
        "
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="currentColor"
          viewBox="0 0 320 512"
          className="h-[20px] w-[20px] text-black transition-colors duration-200 group-hover:text-blue-900"
        >
          <path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z" />
        </svg>
      </a>
    </li>

    {/* Instagram */}
    <li>
      <a
        href="https://www.instagram.com/saminatura.bnf/"
        aria-label="Instagram"
        className="
          group inline-flex items-center justify-center
          w-[50px] h-[50px] rounded-full
          bg-white shadow-[0_10px_10px_rgba(0,0,0,0.1)]
          transition-transform duration-200
          hover:-translate-y-[3px]
        "
      >
        <svg
          viewBox="0 0 16 16"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
          className="h-[20px] w-[20px] text-black transition-colors duration-200 group-hover:text-red-600"
        >
          <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.917 3.917 0 0 0-1.417.923A3.927 3.927 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.916 3.916 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.926 3.926 0 0 0-.923-1.417A3.911 3.911 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0h.003zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599.28.28.453.546.598.92.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.47 2.47 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.478 2.478 0 0 1-.92-.598 2.48 2.48 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233 0-2.136.008-2.388.046-3.231.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92.28-.28.546-.453.92-.598.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045v.002zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92zm-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217zm0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334z" />
        </svg>
      </a>
    </li>

    {/* WhatsApp */}
    <li>
      <a
        href="#"
        aria-label="WhatsApp"
        className="
          group inline-flex items-center justify-center
          w-[50px] h-[50px] rounded-full
          bg-white shadow-[0_10px_10px_rgba(0,0,0,0.1)]
          transition-transform duration-200
          hover:-translate-y-[3px]
        "
      >
        {/* Font Awesome WhatsApp (solid) */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 448 512"
          fill="currentColor"
          className="h-[22px] w-[22px] text-black transition-colors duration-200 group-hover:text-emerald-600"
        >
          <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32 101.3 32 1.5 131.8 1.5 254.4c0 43.4 11.4 85.7 33 122.9L0 480l105.5-32.3c35.7 19.5 75.9 29.8 117.1 29.8h.1c122.6 0 222.4-99.8 222.4-222.4 0-59.4-23.1-115.2-65.2-157.1zM223 438.7h-.1c-36.7 0-72.7-9.9-104.1-28.6l-7.5-4.5-62.6 19.2 20.4-61.1-4.9-7.9c-20.4-32.4-31.2-69.8-31.2-108.1C33 155.9 122.6 66.2 223.9 66.2c49.1 0 95.2 19.1 129.9 53.8 34.7 34.7 53.8 80.8 53.8 129.9 0 101.3-89.7 188.8-184.6 188.8zm101.1-138.3c-5.5-2.8-32.6-16.1-37.6-17.9-5-1.8-8.6-2.8-12.2 2.8-3.6 5.5-14 17.9-17.2 21.6-3.2 3.6-6.4 4.1-11.9 1.4-5.5-2.8-23.2-8.6-44.2-27.4-16.3-14.6-27.3-32.6-30.5-38.1-3.2-5.5-.3-8.5 2.4-11.2 2.5-2.5 5.5-6.4 8.2-9.6 2.8-3.2 3.6-5.5 5.5-9.2 1.8-3.6.9-6.9-.5-9.6-1.4-2.8-12.2-29.3-16.7-40.1-4.4-10.5-8.9-9.1-12.2-9.2-3.2-.1-6.9-.1-10.5-.1-3.6 0-9.6 1.4-14.6 6.9-5 5.5-19.1 18.7-19.1 45.7 0 27 19.6 53.1 22.3 56.8 2.8 3.6 38.6 58.9 93.5 82.6 13.1 5.6 23.3 9 31.2 11.5 13.1 4.2 25.1 3.6 34.6 2.2 10.6-1.6 32.6-13.3 37.2-26.1 4.6-12.8 4.6-23.8 3.2-26.1-1.4-2.3-5-3.6-10.5-6.4z" />
        </svg>
      </a>
    </li>

    {/* TikTok */}
    <li>
      <a
        href="#"
        aria-label="TikTok"
        className="
          group inline-flex items-center justify-center
          w-[50px] h-[50px] rounded-full
          bg-white shadow-[0_10px_10px_rgba(0,0,0,0.1)]
          transition-transform duration-200
          hover:-translate-y-[3px]
        "
      >
        {/* Font Awesome TikTok (brands) */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 448 512"
          fill="currentColor"
          className="h-[22px] w-[22px] text-black transition-colors duration-200 group-hover:text-pink-900"
        >
          <path d="M448 209.9v125.7c-49.9 0-97.4-16.2-136.4-46.1v97.4c0 69.6-56.5 126.1-126.1 126.1S59.4 456.5 59.4 386.9s56.5-126.1 126.1-126.1c6.9 0 13.6 .6 20.2 1.7V335c-5.9-2-12.2-3.1-18.7-3.1c-31.9 0-57.8 25.9-57.8 57.8s25.9 57.8 57.8 57.8s57.8-25.9 57.8-57.8V0h84.7c0 79.5 64.4 143.9 143.9 143.9v66z" />
        </svg>
      </a>
    </li>
  </ul>
</div>

        {/* Col 3 */}
        <div>
          <h4 className="font-bold mb-4">Contactos</h4>
          <p className="text-sm">
            Email: saminatura369@gmail.com
            <br />
            Teléfono: +34 631 415 075
          </p>
        </div>
      </div>

      <div className="text-center text-xs mt-6 mr-10 text-black">
        © 2025 SAMINATURA
      </div>
    </footer>
  );
}
