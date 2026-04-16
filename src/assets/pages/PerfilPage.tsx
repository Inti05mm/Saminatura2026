import Footer from "../containers/Footer.tsx";
import Header from "../containers/Header";
import UserProfile from "../containers/UserProfile";

export default function PerfilPage() {
  return (
    <main className="min-h-screen gris ">
      <Header />
      <UserProfile />
      <Footer/>
    </main>
  );
}
