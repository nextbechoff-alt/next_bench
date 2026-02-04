import { Outlet, useNavigate } from "react-router-dom";
import { Header } from "../app/components/header";
import { isLoggedIn } from "./../utils/auth";

export default function MainLayout() {
  const navigate = useNavigate();


  return (
    <>
      <Header
        onSearch={() => { }}
        onChatClick={() => { }}
        onAddListingClick={() => {
          if (!isLoggedIn()) {
            navigate("/login");
          }
        }}
        onProfileClick={() => navigate("/profile")}
      />

      <main>
        <Outlet />
      </main>
    </>
  );
}
