import Header from "../containers/Header";
import CartContainer from "../containers/CartContainer";
import Footer from "../containers/Footer.tsx";

export default function BellezaPage() {
  return (
    <main>
      <div className="min-h-screen gris  ">
      <Header />
      <CartContainer />
      </div>  
      <Footer/>
    </main>
  );
}
