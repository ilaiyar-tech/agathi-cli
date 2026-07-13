import Header from "../components/header";
import Sidebar from "../components/sidebar";
import { Outlet } from "react-router-dom";

export default function dashboard_layout() {
  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "var(--bg_color)"
      }}
    >
      <aside
        style={{
          width: "260px",
          borderRight: "1px solid var(--card_border)",
          background: "rgba(13,18,30,.55)",
          backdropFilter: "blur(20px)",
          padding: "24px"
        }}
      >
        <h2
          style={{
            color: "#fff",
            fontSize: "24px"
          }}
        >
          agathi_ai
        </h2><Sidebar /><Sidebar /><Sidebar />
      </aside>

      <div style={{flex:1,display:"flex",flexDirection:"column"}}><Header/><main
        style={{
          flex: 1,
          padding: "32px",
          overflow: "auto"
        }}
      >
        <Outlet />
      </main></div>
    </div>
  );
}
