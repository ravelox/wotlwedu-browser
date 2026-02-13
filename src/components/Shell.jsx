import { NavLink } from "react-router-dom";
import logo from "../assets/logo.png";

const NAV_ITEMS = [
  ["Dashboard", "/dashboard"],
  ["Organizations", "/organizations"],
  ["Workgroups", "/workgroups"],
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

export default function Shell({ session, onLogout, children }) {
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
          </div>
          <button className="btn btn-secondary" onClick={onLogout}>Logout</button>
        </header>
        <section className="page-body">{children}</section>
      </main>
    </div>
  );
}
