import heroImg from "../pictures/fainal.png";

export default function HeroSaminatura() {
  return (
    <section className="relative w-full overflow-hidden bg-[#f7f3ea]">
      <img
        src={heroImg}
        alt="Saminatura - Natural, Bio y Bienestar"
        className="block h-auto w-full"
      />

      <div className="pointer-events-none absolute inset-0 bg-white/5" />

      {/* Centro exacto del hero */}
      <div className="absolute left-1/2 top-1/2 z-10 flex w-full -translate-x-1/2 -translate-y-1/2 flex-col items-center px-4 text-center sm:px-6">
        <h1
          className="
            pl-[0.08em]
            font-serif
            text-3xl
            tracking-[0.08em]
            text-[#2f3a1f]
            sm:text-5xl
            md:text-6xl
            lg:text-7xl
            xl:text-8xl
          "
        >
          SAMINATURA
        </h1>

        <div className="mt-3 h-[2px] w-20 bg-[#7b8f45] sm:mt-4 sm:w-28" />

        <p
          className="
            mt-3
            pl-[0.25em]
            text-[10px]
            uppercase
            tracking-[0.25em]
            text-[#66704c]
            sm:mt-4
            sm:pl-[0.35em]
            sm:text-sm
            sm:tracking-[0.35em]
            md:text-base
          "
        >
          Natural · Bio · Bienestar
        </p>
      </div>
    </section>
  );
}