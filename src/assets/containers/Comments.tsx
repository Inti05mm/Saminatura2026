export function Comments() {
  return (
    <div className="bg-gray-100 p-6 rounded-lg shadow-md max-w-4xl mx-auto my-12">
      <h2 className="text-2xl font-bold mb-6 text-center">Comentarios de la Comunidad</h2>
      <div className="flex flex-col space-y-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-bold">John Doe</h3>
          <p className="text-gray-500 text-sm mb-2">Publicado el 17 de Abril, 2023</p>
          <p className="text-gray-700">
            ¡Me encantó este producto! Aprendí nuevas recetas con ingredientes de la tienda.
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-bold">Jane Smith</h3>
          <p className="text-gray-500 text-sm mb-2">Publicado el 16 de Abril, 2023</p>
          <p className="text-gray-700">
            Gracias a un suplemento que probé, mi bienestar ha mejorado mucho. Recomiendo a todos probarlo.
          </p>
        </div>

        {/* Formulario para agregar comentario */}
        <form className="bg-white p-4 rounded-lg shadow space-y-4">
          <h3 className="text-lg font-bold">Agregar un comentario</h3>
          <input
            type="text"
            placeholder="Tu nombre"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:ring-green-200"
          />
          <textarea
            placeholder="Escribe tu comentario..."
            rows={3}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:ring-green-200"
          ></textarea>
          <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium">
            Enviar
          </button>
        </form>
      </div>
    </div>
  )
}
