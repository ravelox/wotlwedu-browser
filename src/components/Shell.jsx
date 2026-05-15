import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import logo from "../assets/logo.png";
import { SearchPicker } from "./AdminControls";

const NAV_ITEMS = [
  ["Dashboard", "/dashboard"],
  ["Profile", "/profile"],
  ["Organizations", "/organizations"],
  ["Spaces", "/spaces"],
  ["Circles", "/circles"],
  ["People", "/people"],
  ["Roles", "/roles"],
  ["Capabilities", "/capabilities"],
  ["Categories", "/categories"],
  ["Items", "/items"],
  ["Pictures", "/pictures"],
  ["Lists", "/lists"],
  ["Polls", "/polls"],
  ["Votes", "/votes"],
  ["Notifications", "/notifications"],
  ["Preferences", "/preferences"],
];

export default function Shell({
  session,
  onLogout,
  children,
  api,
  appVersion,
  activeWorkgroupId,
  activeOrganizationId,
  globalModeConfirmed,
  onChangeActiveOrganizationId,
  onChangeGlobalModeConfirmed,
  onChangeActiveWorkgroupId,
}) {
  const [workgroups, setWorkgroups] = useState([]);
  const navItems = [
    ...NAV_ITEMS,
    ...((session?.systemAdmin || session?.organizationAdmin) ? [["Support", "/support"]] : []),
    ...((session?.systemAdmin || session?.organizationAdmin) ? [["Backup", "/backup"]] : []),
    ...(session?.systemAdmin ? [["Configuration", "/configuration"]] : []),
    ...(session?.systemAdmin ? [["Token Lab", "/token-lab"]] : []),
  ];

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!api || !session?.authToken) return;
      if (session?.systemAdmin === true && !activeOrganizationId) {
        setWorkgroups([]);
        return;
      }
      const response = await api.get("/space", {
        params: {
          page: 1,
          items: 50,
          organizationId: activeOrganizationId || session?.organizationId || undefined,
          detail: undefined,
        },
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
  }, [api, session?.authToken, session?.systemAdmin, session?.organizationId, activeOrganizationId]);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <img src={logo} alt="wotlwedu logo" className="brand-logo" />
          <h1>wotlwedu</h1>
          <p>Browser Console</p>
        </div>
        <nav>
          {navItems.map(([label, href]) => (
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
        <div className="sidebar-version">Version {appVersion}</div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div>
            <strong>{session?.alias || session?.email || "Person"}</strong>
            <p>
              {session?.systemAdmin ? "System Admin" : session?.organizationAdmin ? "Organization Admin" : session?.workgroupAdmin ? "Space Admin" : "Person"}
              {session?.organizationId ? ` • ${session.organizationId}` : ""}
            </p>
            <div className="scope-controls">
              {session?.systemAdmin === true ? (
                <label className="scope-control">
                  <span>Organization</span>
                  <SearchPicker
                    api={api}
                    path="/organization"
                    listKey="organizations"
                    value={activeOrganizationId || ""}
                    onChange={onChangeActiveOrganizationId}
                    placeholder="Search organizations"
                  />
                </label>
              ) : null}
              {session?.systemAdmin === true && !activeOrganizationId ? (
                <label className="scope-control scope-check">
                  <input
                    type="checkbox"
                    checked={globalModeConfirmed}
                    onChange={(event) => onChangeGlobalModeConfirmed(event.target.checked)}
                  />
                  <span>Global mode</span>
                </label>
              ) : null}
              <label className="scope-control">
                <span>Space</span>
                <select
                  value={activeWorkgroupId || ""}
                  onChange={(e) =>
                    onChangeActiveWorkgroupId(
                      e.target.value === "" ? null : e.target.value
                    )
                  }
                >
                  <option value="">(none)</option>
                  {workgroups.map((wg) => (
                    <option key={wg.id} value={wg.id}>
                      {wg.name || wg.id}
                    </option>
                  ))}
                </select>
              </label>
              <div className="breadcrumb-row">
                <span>Org: {activeOrganizationId || session?.organizationId || "none"}</span>
                <span>Space: {activeWorkgroupId || "none"}</span>
                {globalModeConfirmed ? <span className="danger-text">Global confirmed</span> : null}
              </div>
            </div>
          </div>
          <button className="btn btn-secondary" onClick={onLogout}>Logout</button>
        </header>
        <section className="page-body">{children}</section>
      </main>
    </div>
  );
}
