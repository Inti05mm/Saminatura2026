export function Testimonios() {
  return (
    <section className="bg-white px-4 py-12 md:py-24">
      <div className="max-w-7xl mx-auto">
        <h2 className="font-black text-black text-center text-3xl mb-12 uppercase">
          Lo que nuestra comunidad dice
        </h2>
        <div className="flex flex-col space-y-4 md:flex-row md:space-x-4 md:space-y-0">
          {["John Doe", "Jane Smith", "Emily Johnson"].map((user, idx) => (
            <div key={idx} className="bg-gray-200 rounded-lg p-8 text-center md:w-1/3">
              <p className="font-bold uppercase">{user}</p>
              <p className="text-gray-700 italic text-lg mt-2">
                Esta tienda cambió mi manera de cocinar y cuidar mi salud. ¡Me encanta!
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
