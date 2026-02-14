import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import Shell from "./components/Shell";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ResourcePage from "./pages/ResourcePage";
import { createApi } from "./lib/api";
import { clearSession, getSession, setSession } from "./lib/session";
import { RESOURCE_DEFS } from "./lib/resourceDefs";
import { getActiveWorkgroupId, setActiveWorkgroupId } from "./lib/workgroupScope";

const DEFAULT_API_BASE_URL =
  import.meta.env.VITE_WOTLWEDU_API_BASE_URL || "https://api.wotlwedu.com:9876";

function RequireAuth({ session, children }) {
  const location = useLocation();
  if (!session?.authToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

export default function App() {
  const navigate = useNavigate();
  const [session, setSessionState] = useState(getSession());
  const [baseUrl, setBaseUrl] = useState(
    localStorage.getItem("wotlwedu_browser_api") || DEFAULT_API_BASE_URL
  );
  const hasApiOverride = localStorage.getItem("wotlwedu_browser_api") !== null;
  const [activeWorkgroupId, setActiveWorkgroupIdState] = useState(
    getActiveWorkgroupId()
  );

  const api = useMemo(() => {
    const onUnauthorized = () => {
      if (!session?.authToken) return;
      clearSession();
      setSessionState(null);
      navigate("/login");
    };
    return createApi(baseUrl, onUnauthorized);
  }, [baseUrl, navigate, session?.authToken]);

  const onLogin = (payload) => {
    const loginData = payload?.data ? payload.data : payload;
    const nextSession = {
      authToken: loginData?.authToken,
      refreshToken: loginData?.refreshToken,
      userId: loginData?.userId,
      email: loginData?.email,
      alias: loginData?.alias,
      systemAdmin: loginData?.systemAdmin === true,
      organizationAdmin: loginData?.organizationAdmin === true,
      workgroupAdmin: loginData?.workgroupAdmin === true,
      organizationId: loginData?.organizationId || null,
      adminWorkgroupId: loginData?.adminWorkgroupId || null,
    };
    setSession(nextSession);
    setSessionState(nextSession);
    // If the user is a workgroup admin and no scope is set yet, default to their admin workgroup.
    if (!getActiveWorkgroupId() && nextSession.workgroupAdmin && nextSession.adminWorkgroupId) {
      setActiveWorkgroupId(nextSession.adminWorkgroupId);
      setActiveWorkgroupIdState(nextSession.adminWorkgroupId);
    }
    navigate("/dashboard", { replace: true });
  };

  const onLogout = () => {
    clearSession();
    setSessionState(null);
    setActiveWorkgroupId(null);
    setActiveWorkgroupIdState(null);
    navigate("/login", { replace: true });
  };

  const ResourceRoute = (key) => {
    const def = RESOURCE_DEFS[key];
    return (
      <ResourcePage
        // Force a remount when switching resources so table/form panes never show stale state
        // from the previous route (filters, selected row, etc).
        key={key}
        api={api}
        definition={def}
        scope={{ activeWorkgroupId }}
      />
    );
  };

  const onResetApiUrl = () => {
    localStorage.removeItem("wotlwedu_browser_api");
    setBaseUrl(DEFAULT_API_BASE_URL);
  };

  return (
    <Routes>
      <Route path="/login" element={<LoginPage api={api} onLogin={onLogin} />} />

      <Route
        path="/*"
        element={
          <RequireAuth session={session}>
            <Shell
              session={session}
              onLogout={onLogout}
              api={api}
              activeWorkgroupId={activeWorkgroupId}
              onChangeActiveWorkgroupId={(id) => {
                setActiveWorkgroupId(id);
                setActiveWorkgroupIdState(id);
              }}
            >
              <div className="api-bar">
                <label>
                  API Base URL
                  <input
                    value={baseUrl}
                    onChange={(e) => {
                      const value = e.target.value;
                      setBaseUrl(value);
                      localStorage.setItem("wotlwedu_browser_api", value);
                    }}
                  />
                </label>
                <div className="api-bar-actions">
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={onResetApiUrl}
                    disabled={!hasApiOverride && baseUrl === DEFAULT_API_BASE_URL}
                  >
                    Reset to Default
                  </button>
                </div>
              </div>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage api={api} />} />
                <Route path="/organizations" element={ResourceRoute("organizations")} />
                <Route path="/workgroups" element={ResourceRoute("workgroups")} />
                <Route path="/groups" element={ResourceRoute("groups")} />
                <Route path="/users" element={ResourceRoute("users")} />
                <Route path="/roles" element={ResourceRoute("roles")} />
                <Route path="/capabilities" element={ResourceRoute("capabilities")} />
                <Route path="/categories" element={ResourceRoute("categories")} />
                <Route path="/items" element={ResourceRoute("items")} />
                <Route path="/images" element={ResourceRoute("images")} />
                <Route path="/lists" element={ResourceRoute("lists")} />
                <Route path="/elections" element={ResourceRoute("elections")} />
                <Route path="/votes" element={ResourceRoute("votes")} />
                <Route path="/notifications" element={ResourceRoute("notifications")} />
                <Route path="/preferences" element={ResourceRoute("preferences")} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Shell>
          </RequireAuth>
        }
      />
    </Routes>
  );
}
