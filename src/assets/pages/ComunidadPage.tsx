
import {Comments} from "../containers/Comments"
import {Testimonios} from "../containers/Testimonios"
import { Posts } from "../containers/Posts"
import Header from "../containers/Header"
import Footer from "../containers/Footer"


export default function ComunidadPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-0!">
        <Header/>
      <Comments />
      <Testimonios />
      <Posts />
      <Footer/>
    </div>
  )
}
