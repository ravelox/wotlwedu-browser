import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import Shell from "./components/Shell";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ResourcePage from "./pages/ResourcePage";
import AIWorkbenchPage from "./pages/AIWorkbenchPage";
import { createApi } from "./lib/api";
import { clearSession, getSession, setSession } from "./lib/session";
import { RESOURCE_DEFS } from "./lib/resourceDefs";

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
    localStorage.getItem("wotlwedu_browser_api") || "https://api.wotlwedu.com:9876"
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
    const nextSession = {
      authToken: payload.authToken,
      refreshToken: payload.refreshToken,
      userId: payload.userId,
      email: payload.email,
      alias: payload.alias,
      systemAdmin: payload.systemAdmin === true,
      organizationAdmin: payload.organizationAdmin === true,
      workgroupAdmin: payload.workgroupAdmin === true,
      organizationId: payload.organizationId || null,
      adminWorkgroupId: payload.adminWorkgroupId || null,
    };
    setSession(nextSession);
    setSessionState(nextSession);
    navigate("/dashboard", { replace: true });
  };

  const onLogout = () => {
    clearSession();
    setSessionState(null);
    navigate("/login", { replace: true });
  };

  const ResourceRoute = (key) => {
    const def = RESOURCE_DEFS[key];
    return <ResourcePage api={api} definition={def} />;
  };

  return (
    <Routes>
      <Route path="/login" element={<LoginPage api={api} onLogin={onLogin} />} />

      <Route
        path="/*"
        element={
          <RequireAuth session={session}>
            <Shell session={session} onLogout={onLogout}>
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
              </div>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage api={api} />} />
                <Route path="/organizations" element={ResourceRoute("organizations")} />
                <Route path="/workgroups" element={ResourceRoute("workgroups")} />
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
                <Route path="/ai" element={<AIWorkbenchPage api={api} />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Shell>
          </RequireAuth>
        }
      />
    </Routes>
  );
}
