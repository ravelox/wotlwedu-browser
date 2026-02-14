import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import logo from "../assets/logo.png";

const NAV_ITEMS = [
  ["Dashboard", "/dashboard"],
  ["Organizations", "/organizations"],
  ["Workgroups", "/workgroups"],
  ["Groups", "/groups"],
  ["Users", "/users"],
  ["Roles", "/roles"],
  ["Capabilities", "/capabilities"],
  ["Categories", "/categories"],
  ["Items", "/items"],
  ["Images", "/images"],
  ["Lists", "/lists"],
  ["Elections", "/elections"],
  ["Votes", "/votes"],
  ["Notifications", "/notifications"],
  ["Preferences", "/preferences"],
  ["AI Workbench", "/ai"],
];

export default function Shell({
  session,
  onLogout,
  children,
  api,
  activeWorkgroupId,
  onChangeActiveWorkgroupId,
}) {
  const [workgroups, setWorkgroups] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!api || !session?.authToken) return;
      const response = await api.get("/workgroup", {
        params: { page: 1, items: 200, detail: undefined },
      });
      const list =
        response.data?.data?.workgroups ||
        response.data?.workgroups ||
        [];
      if (!cancelled) setWorkgroups(Array.isArray(list) ? list : []);
    }
    load().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [api, session?.authToken]);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <img src={logo} alt="wotlwedu logo" className="brand-logo" />
          <h1>wotlwedu</h1>
          <p>Browser Console</p>
        </div>
        <nav>
          {NAV_ITEMS.map(([label, href]) => (
            <NavLink
              key={href}
              to={href}
              className={({ isActive }) =>
                `nav-link${isActive ? " nav-link-active" : ""}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div>
            <strong>{session?.alias || session?.email || "User"}</strong>
            <p>
              {session?.systemAdmin ? "System Admin" : session?.organizationAdmin ? "Organization Admin" : session?.workgroupAdmin ? "Workgroup Admin" : "User"}
              {session?.organizationId ? ` • ${session.organizationId}` : ""}
            </p>
            <div style={{ marginTop: 6 }}>
              <label style={{ fontSize: 12, color: "var(--muted)" }}>
                Workgroup Scope{" "}
                <select
                  value={activeWorkgroupId || ""}
                  onChange={(e) =>
                    onChangeActiveWorkgroupId(
                      e.target.value === "" ? null : e.target.value
                    )
                  }
                  style={{ marginLeft: 8 }}
                >
                  <option value="">(none)</option>
                  {workgroups.map((wg) => (
                    <option key={wg.id} value={wg.id}>
                      {wg.name || wg.id}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <button className="btn btn-secondary" onClick={onLogout}>Logout</button>
        </header>
        <section className="page-body">{children}</section>
      </main>
    </div>
  );
}
