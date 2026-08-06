import Footer from "../containers/Footer";
import Header from "../containers/Header";
import UserProfile from "../containers/UserProfile";

export default function PerfilPage() {
  return (
    <main className="min-h-screen bg-[#f5f1e8]">
      <Header />
      <UserProfile />
      <Footer />
    </main>
  );
}