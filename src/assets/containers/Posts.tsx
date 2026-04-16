import image from "../pictures/inicio.jpg"

export function Posts() {
  return (
    <div className="bg-gray-100 p-6 flex flex-col space-y-6 max-w-4xl mx-auto my-12">
      <h2 className="text-2xl font-bold text-center mb-6">Publicaciones de la Comunidad</h2>

      {/* Post */}
      {[1,2].map((post) => (
        <div key={post} className="bg-white rounded-lg shadow-md p-4">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center space-x-3">
              <img
                className="w-12 h-12 rounded-full object-cover"
                src= {image}
                alt="Avatar"
              />
              <div className="text-sm">
                <p className="font-semibold">Usuario {post}</p>
                <p className="text-gray-500 text-xs">Publicado hace {post}d</p>
              </div>
            </div>
            <button className="text-gray-500 hover:bg-gray-100 rounded-full p-1.5">
              ...
            </button>
          </div>

          <p className="text-gray-700 mb-3">
            Este es un post de ejemplo donde comparto una receta o mi experiencia con un producto de la tienda.
          </p>

          <img
            src={image}
            alt="Post media"
            className="w-full rounded-lg mb-3 object-cover"
          />

          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>❤️ 25 Likes</span>
            <span>💬 8 Comentarios</span>
          </div>
        </div>
      ))}

      {/* Formulario de nueva publicación */}
      <form className="bg-white p-4 rounded-lg shadow-md space-y-4">
        <h3 className="text-lg font-bold">Crear nueva publicación</h3>
        <textarea
          placeholder="Comparte algo con la comunidad..."
          rows={3}
          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:ring-green-200"
        ></textarea>
        <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium">
          Publicar
        </button>
      </form>
    </div>
  )
}
