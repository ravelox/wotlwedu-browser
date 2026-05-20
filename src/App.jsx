import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import Shell from "./components/Shell";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ResourcePage from "./pages/ResourcePage";
import TokenLabPage from "./pages/TokenLabPage";
import ProfilePage from "./pages/ProfilePage";
import SupportPage from "./pages/SupportPage";
import AuditExplorerPage from "./pages/AuditExplorerPage";
import ConfigPage from "./pages/ConfigPage";
import BackupPage from "./pages/BackupPage";
import { createApi } from "./lib/api";
import { clearSession, getSession, setSession } from "./lib/session";
import { RESOURCE_DEFS } from "./lib/resourceDefs";
import { getActiveWorkgroupId, setActiveWorkgroupId } from "./lib/workgroupScope";
import packageJson from "../package.json";

const DEFAULT_API_BASE_URL =
  import.meta.env.VITE_WOTLWEDU_API_BASE_URL || "https://api.wotlwedu.com:9876";
const APP_VERSION = import.meta.env.VITE_APP_VERSION || packageJson.version;
const ACTIVE_ORGANIZATION_KEY = "wotlwedu_browser_active_organization";
const GLOBAL_MODE_KEY = "wotlwedu_browser_global_mode_confirmed";
const GLOBAL_MODE_DURATION_MS = 15 * 60 * 1000;

function getStoredGlobalModeExpiresAt() {
  const stored = localStorage.getItem(GLOBAL_MODE_KEY);
  if (!stored) return 0;
  if (stored === "true") return Date.now() + GLOBAL_MODE_DURATION_MS;
  const parsed = Number(stored);
  return Number.isFinite(parsed) && parsed > Date.now() ? parsed : 0;
}

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
  const [activeOrganizationId, setActiveOrganizationIdState] = useState(
    localStorage.getItem(ACTIVE_ORGANIZATION_KEY) || getSession()?.organizationId || ""
  );
  const [globalModeExpiresAt, setGlobalModeExpiresAt] = useState(getStoredGlobalModeExpiresAt);
  const globalModeConfirmed = Boolean(globalModeExpiresAt && globalModeExpiresAt > Date.now());

  const api = useMemo(() => {
    const onUnauthorized = () => {
      if (!session?.authToken) return;
      clearSession();
      setSessionState(null);
      navigate("/login");
    };
    return createApi(baseUrl, onUnauthorized, setSessionState);
  }, [baseUrl, navigate, session?.authToken]);

  useEffect(() => {
    if (!globalModeExpiresAt) return undefined;
    if (globalModeExpiresAt <= Date.now()) {
      setGlobalModeExpiresAt(0);
      localStorage.removeItem(GLOBAL_MODE_KEY);
      return undefined;
    }
    const timeout = window.setTimeout(() => {
      setGlobalModeExpiresAt(0);
      localStorage.removeItem(GLOBAL_MODE_KEY);
    }, globalModeExpiresAt - Date.now());
    return () => window.clearTimeout(timeout);
  }, [globalModeExpiresAt]);

  const setGlobalModeConfirmed = (confirmed) => {
    if (!confirmed) {
      setGlobalModeExpiresAt(0);
      localStorage.removeItem(GLOBAL_MODE_KEY);
      return;
    }
    const expiresAt = Date.now() + GLOBAL_MODE_DURATION_MS;
    setGlobalModeExpiresAt(expiresAt);
    localStorage.setItem(GLOBAL_MODE_KEY, String(expiresAt));
  };

  const resetGlobalModeAfterAction = () => {
    if (!activeOrganizationId && globalModeConfirmed) {
      setGlobalModeConfirmed(false);
    }
  };

  const onLogin = (payload) => {
    const loginData = payload?.data ? payload.data : payload;
    const nextSession = {
      authToken: loginData?.authToken,
      refreshToken: loginData?.refreshToken,
      sessionId: loginData?.sessionId,
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

  const onLogout = async () => {
    if (session?.authToken) {
      await api.post("/login/logout").catch(() => null);
    }
    clearSession();
    setSessionState(null);
    setActiveWorkgroupId(null);
    setActiveWorkgroupIdState(null);
    localStorage.removeItem(ACTIVE_ORGANIZATION_KEY);
    localStorage.removeItem(GLOBAL_MODE_KEY);
    setActiveOrganizationIdState("");
    setGlobalModeExpiresAt(0);
    navigate("/login", { replace: true });
  };

  const onApplyToken = (payload) => {
    const tokenData = payload?.data ? payload.data : payload;
    if (!tokenData?.authToken || !tokenData?.userId) return;
    const nextSession = {
      authToken: tokenData.authToken,
      refreshToken: null,
      userId: tokenData.userId,
      email: tokenData.email,
      alias: tokenData.alias,
      systemAdmin: tokenData.systemAdmin === true,
      organizationAdmin: tokenData.organizationAdmin === true,
      workgroupAdmin: tokenData.workgroupAdmin === true,
      organizationId: tokenData.organizationId || null,
      adminWorkgroupId: tokenData.adminWorkgroupId || null,
    };
    setSession(nextSession);
    setSessionState(nextSession);

    if (nextSession.workgroupAdmin && nextSession.adminWorkgroupId) {
      setActiveWorkgroupId(nextSession.adminWorkgroupId);
      setActiveWorkgroupIdState(nextSession.adminWorkgroupId);
    } else {
      setActiveWorkgroupId(null);
      setActiveWorkgroupIdState(null);
    }
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
        session={session}
        scope={{ activeWorkgroupId, activeOrganizationId, globalModeConfirmed }}
        onGlobalModeUsed={resetGlobalModeAfterAction}
      />
    );
  };

  const onResetApiUrl = () => {
    localStorage.removeItem("wotlwedu_browser_api");
    setBaseUrl(DEFAULT_API_BASE_URL);
  };

  return (
    <Routes>
      <Route path="/login" element={<LoginPage api={api} onLogin={onLogin} appVersion={APP_VERSION} />} />

      <Route
        path="/*"
        element={
          <RequireAuth session={session}>
            <Shell
              session={session}
              onLogout={onLogout}
              api={api}
              appVersion={APP_VERSION}
              activeWorkgroupId={activeWorkgroupId}
              activeOrganizationId={activeOrganizationId}
              globalModeConfirmed={globalModeConfirmed}
              globalModeExpiresAt={globalModeExpiresAt}
              onChangeActiveOrganizationId={(id) => {
                const next = id || "";
                if (next) localStorage.setItem(ACTIVE_ORGANIZATION_KEY, next);
                else localStorage.removeItem(ACTIVE_ORGANIZATION_KEY);
                setActiveOrganizationIdState(next);
                setGlobalModeConfirmed(false);
                setActiveWorkgroupId(null);
                setActiveWorkgroupIdState(null);
              }}
              onChangeGlobalModeConfirmed={setGlobalModeConfirmed}
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
                    title="Reset API base URL to the configured default"
                  >
                    Reset to Default
                  </button>
                </div>
              </div>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route
                  path="/dashboard"
                  element={
                    <DashboardPage
                      api={api}
                      session={session}
                      scope={{ activeOrganizationId, globalModeConfirmed }}
                    />
                  }
                />
                <Route path="/profile" element={<ProfilePage api={api} session={session} onLogout={onLogout} />} />
                <Route
                  path="/support"
                  element={
                    <SupportPage
                      api={api}
                      session={session}
                      initialOrganizationId={activeOrganizationId}
                      globalModeConfirmed={globalModeConfirmed}
                      globalModeExpiresAt={globalModeExpiresAt}
                      onChangeGlobalModeConfirmed={setGlobalModeConfirmed}
                      onGlobalModeUsed={resetGlobalModeAfterAction}
                    />
                  }
                />
                <Route
                  path="/audit"
                  element={
                    <AuditExplorerPage
                      api={api}
                      session={session}
                      initialOrganizationId={activeOrganizationId}
                      globalModeConfirmed={globalModeConfirmed}
                      globalModeExpiresAt={globalModeExpiresAt}
                    />
                  }
                />
                <Route path="/organizations" element={ResourceRoute("organizations")} />
                <Route path="/spaces" element={ResourceRoute("workgroups")} />
                <Route path="/circles" element={ResourceRoute("groups")} />
                <Route path="/people" element={ResourceRoute("users")} />
                <Route path="/roles" element={ResourceRoute("roles")} />
                <Route path="/capabilities" element={ResourceRoute("capabilities")} />
                <Route path="/categories" element={ResourceRoute("categories")} />
                <Route path="/items" element={ResourceRoute("items")} />
                <Route path="/pictures" element={ResourceRoute("images")} />
                <Route path="/lists" element={ResourceRoute("lists")} />
                <Route path="/polls" element={ResourceRoute("elections")} />
                <Route path="/votes" element={ResourceRoute("votes")} />
                <Route path="/notifications" element={ResourceRoute("notifications")} />
                <Route path="/preferences" element={ResourceRoute("preferences")} />
                <Route
                  path="/backup"
                  element={
                    <BackupPage
                      api={api}
                      session={session}
                      scope={{ activeWorkgroupId, activeOrganizationId, globalModeConfirmed }}
                      onGlobalModeUsed={resetGlobalModeAfterAction}
                    />
                  }
                />
                <Route path="/configuration" element={<ConfigPage api={api} session={session} />} />
                <Route
                  path="/token-lab"
                  element={
                    <TokenLabPage
                      api={api}
                      session={session}
                      scope={{ activeOrganizationId, globalModeConfirmed }}
                      onApplyToken={onApplyToken}
                      onGlobalModeUsed={resetGlobalModeAfterAction}
                    />
                  }
                />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Shell>
          </RequireAuth>
        }
      />
    </Routes>
  );
}
