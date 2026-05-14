import { useEffect, useState } from "react";
import { ErrorBanner, SuccessBanner } from "../components/Feedback";
import { toApiError } from "../lib/api";

function formatAudit(audit) {
  if (!audit) return "Unknown activity";
  return audit.message || `${audit.eventType || "activity"} ${audit.provider || ""}`.trim();
}

function formatMethod(method) {
  if (!method) return "Unknown";
  return `${method.provider || "provider"}${method.email ? ` • ${method.email}` : ""}`;
}

export default function SupportPage({ api, session }) {
  const [organizationId, setOrganizationId] = useState(session?.organizationId || "");
  const [days, setDays] = useState(7);
  const [eventType, setEventType] = useState("");
  const [outcome, setOutcome] = useState("");
  const [provider, setProvider] = useState("");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [overview, setOverview] = useState(null);
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedMethods, setSelectedMethods] = useState({
    passwordEnabled: false,
    linkedProviders: [],
  });
  const [selectedAudits, setSelectedAudits] = useState([]);
  const [selectedSessions, setSelectedSessions] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canAccessSupport =
    session?.systemAdmin === true || session?.organizationAdmin === true;

  const scopeParams = {
    ...(session?.systemAdmin === true
      ? organizationId.trim()
        ? { organizationId: organizationId.trim() }
        : {}
      : session?.organizationId
        ? { organizationId: session.organizationId }
        : {}),
  };

  async function loadSupportData() {
    if (!canAccessSupport) return;
    setLoading(true);
    setError("");
    try {
      const params = {
        ...scopeParams,
        days,
        ...(eventType.trim() ? { eventType: eventType.trim() } : {}),
        ...(outcome.trim() ? { outcome: outcome.trim() } : {}),
        ...(provider.trim() ? { provider: provider.trim() } : {}),
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(userId.trim() ? { userId: userId.trim() } : {}),
      };
      const [overviewResponse, auditResponse] = await Promise.all([
        api.get("/support/auth/overview", { params }),
        api.get("/support/auth/audit", { params: { ...params, items: 25, page: 1 } }),
      ]);
      if (overviewResponse.status >= 400) {
        throw toApiError(overviewResponse, "Failed to load support overview");
      }
      if (auditResponse.status >= 400) {
        throw toApiError(auditResponse, "Failed to load support audit feed");
      }
      setOverview(overviewResponse.data?.data || null);
      setAudits(auditResponse.data?.data?.audits || []);
    } catch (err) {
      setError(err.message || "Failed to load support data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSupportData().catch(() => {});
  }, [session?.organizationId, session?.systemAdmin, days, eventType, outcome, provider, email, userId, organizationId]);

  async function searchUsers(event) {
    event.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setError("");
    setSuccess("");
    try {
      const response = await api.get("/person", {
        params: { page: 1, items: 25, filter: searchQuery.trim() },
      });
      if (response.status >= 400) {
        throw toApiError(response, "Failed to search people");
      }
      const users = response.data?.data?.users || response.data?.users || [];
      setSearchResults(Array.isArray(users) ? users : []);
      if (!users.length) {
        setSuccess("No people matched the current search.");
      }
    } catch (err) {
      setError(err.message || "Failed to search people");
    }
  }

  async function inspectUser(user) {
    if (!user?.id) return;
    setSelectedUser(user);
    setError("");
    try {
      const [methodsResponse, auditsResponse, sessionsResponse] = await Promise.all([
        api.get(`/support/people/${user.id}/signin-method`),
        api.get(`/support/people/${user.id}/authaudit`, { params: { items: 20 } }),
        api.get(`/support/people/${user.id}/session`),
      ]);
      if (methodsResponse.status >= 400) {
        throw toApiError(methodsResponse, "Failed to load sign-in methods");
      }
      if (auditsResponse.status >= 400) {
        throw toApiError(auditsResponse, "Failed to load person audit activity");
      }
      if (sessionsResponse.status >= 400) {
        throw toApiError(sessionsResponse, "Failed to load sessions");
      }
      setSelectedMethods(
        methodsResponse.data?.data?.methods || {
          passwordEnabled: false,
          linkedProviders: [],
        }
      );
      setSelectedAudits(auditsResponse.data?.data?.audits || []);
      setSelectedSessions(sessionsResponse.data?.data?.sessions || []);
    } catch (err) {
      setError(err.message || "Failed to inspect person");
    }
  }

  async function revokeUserSession(sessionId) {
    if (!selectedUser?.id || !sessionId) return;
    setError("");
    setSuccess("");
    try {
      const response = await api.delete(
        `/support/people/${selectedUser.id}/session/${sessionId}`
      );
      if (response.status >= 400) {
        throw toApiError(response, "Failed to revoke session");
      }
      setSuccess("Session revoked.");
      await inspectUser(selectedUser);
    } catch (err) {
      setError(err.message || "Failed to revoke session");
    }
  }

  async function revokeAllUserSessions() {
    if (!selectedUser?.id) return;
    setError("");
    setSuccess("");
    try {
      const response = await api.post(
        `/support/people/${selectedUser.id}/session/revoke-all`
      );
      if (response.status >= 400) {
        throw toApiError(response, "Failed to revoke sessions");
      }
      setSuccess("All sessions revoked.");
      await inspectUser(selectedUser);
    } catch (err) {
      setError(err.message || "Failed to revoke sessions");
    }
  }

  if (!canAccessSupport) {
    return (
      <div className="panel">
        <h2>Support Console</h2>
        <ErrorBanner error="Organization admin or system admin access required." />
      </div>
    );
  }

  return (
    <div className="profile-stack">
      <section className="panel">
        <h2>Support Console</h2>
        <p style={{ color: "var(--muted)", marginTop: 0 }}>
          Investigate auth activity, invite behavior, and linked sign-in methods without leaving
          the admin client.
        </p>
        <ErrorBanner error={error} />
        <SuccessBanner message={success} />
        <div className="form-grid">
          {session?.systemAdmin === true && (
            <label className="field">
              <span>Organization ID</span>
              <input value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} />
            </label>
          )}
          <label className="field">
            <span>Window (days)</span>
            <input
              type="number"
              min={1}
              max={30}
              value={days}
              onChange={(e) => setDays(Number(e.target.value) || 7)}
            />
          </label>
          <label className="field">
            <span>Event Type</span>
            <input value={eventType} onChange={(e) => setEventType(e.target.value)} />
          </label>
          <label className="field">
            <span>Outcome</span>
            <input value={outcome} onChange={(e) => setOutcome(e.target.value)} />
          </label>
          <label className="field">
            <span>Provider</span>
            <input value={provider} onChange={(e) => setProvider(e.target.value)} />
          </label>
          <label className="field">
            <span>Email</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="field">
            <span>Person ID</span>
            <input value={userId} onChange={(e) => setUserId(e.target.value)} />
          </label>
        </div>
      </section>

      <section className="panel">
        <h2>Observability Snapshot</h2>
        {loading ? (
          <p>Loading support overview...</p>
        ) : (
          <div className="dashboard-grid">
            <article className="panel">
              <h3>Total Events</h3>
              <div className="metric">{overview?.totals?.totalEvents ?? 0}</div>
            </article>
            <article className="panel">
              <h3>Success</h3>
              <div className="metric">{overview?.totals?.successCount ?? 0}</div>
            </article>
            <article className="panel">
              <h3>Non-Success</h3>
              <div className="metric">{overview?.totals?.nonSuccessCount ?? 0}</div>
            </article>
            <article className="panel">
              <h3>Unique Actors</h3>
              <div className="metric">{overview?.totals?.uniqueActors ?? 0}</div>
            </article>
          </div>
        )}
        {!!overview && (
          <div className="form-grid" style={{ marginTop: 12 }}>
            <div className="field">
              <span>Event Types</span>
              <div className="invite-stack">
                {(overview.eventTypes || []).slice(0, 8).map((row) => (
                  <article className="invite-card" key={`event-${row.key}`}>
                    <div className="invite-card-header">
                      <strong>{row.key}</strong>
                      <span className="status-chip">{row.count}</span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
            <div className="field">
              <span>Outcomes</span>
              <div className="invite-stack">
                {(overview.outcomes || []).slice(0, 8).map((row) => (
                  <article className="invite-card" key={`outcome-${row.key}`}>
                    <div className="invite-card-header">
                      <strong>{row.key}</strong>
                      <span className="status-chip">{row.count}</span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
            <div className="field">
              <span>Providers</span>
              <div className="invite-stack">
                {(overview.providers || []).slice(0, 8).map((row) => (
                  <article className="invite-card" key={`provider-${row.key}`}>
                    <div className="invite-card-header">
                      <strong>{row.key}</strong>
                      <span className="status-chip">{row.count}</span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Recent Non-Success Events</h2>
        <div className="invite-stack">
          {(overview?.recentFailures || []).length ? (
            overview.recentFailures.map((audit) => (
              <article className="invite-card" key={audit.id}>
                <div className="invite-card-header">
                  <div>
                    <strong>{audit.eventType}</strong>
                    <p>{formatAudit(audit)}</p>
                  </div>
                  <span className={`status-chip status-${audit.outcome || "unknown"}`}>
                    {audit.outcome || "unknown"}
                  </span>
                </div>
                <small style={{ color: "var(--muted)" }}>
                  {audit.createdAt ? new Date(audit.createdAt).toLocaleString() : "Unknown"}
                </small>
              </article>
            ))
          ) : (
            <p style={{ color: "var(--muted)" }}>No recent non-success events.</p>
          )}
        </div>
      </section>

      <section className="panel">
        <h2>Support Audit Feed</h2>
        <div className="invite-stack">
          {audits.length ? (
            audits.map((audit) => (
              <article className="invite-card" key={audit.id}>
                <div className="invite-card-header">
                  <div>
                    <strong>{audit.eventType}</strong>
                    <p>{formatAudit(audit)}</p>
                  </div>
                  <span className={`status-chip status-${audit.outcome || "unknown"}`}>
                    {audit.outcome || "unknown"}
                  </span>
                </div>
                <small style={{ color: "var(--muted)" }}>
                  {audit.createdAt ? new Date(audit.createdAt).toLocaleString() : "Unknown"}
                  {audit.email ? ` • ${audit.email}` : ""}
                  {audit.organizationId ? ` • ${audit.organizationId}` : ""}
                </small>
              </article>
            ))
          ) : (
            <p style={{ color: "var(--muted)" }}>No audit events matched the current filter.</p>
          )}
        </div>
      </section>

      <section className="panel">
        <h2>Person Investigation</h2>
        <form className="form-grid" onSubmit={searchUsers}>
          <label className="field field-full">
            <span>Person Search</span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Name, alias, or email"
            />
          </label>
          <div className="actions">
            <button className="btn" type="submit">
              Search Users
            </button>
          </div>
        </form>
        <div className="invite-stack">
          {searchResults.map((user) => (
            <article className="invite-card" key={user.id}>
              <div className="invite-card-header">
                <div>
                  <strong>{user.fullName || user.alias || user.email || user.id}</strong>
                  <p>{user.email || user.id}</p>
                </div>
                <button className="btn btn-secondary" type="button" onClick={() => inspectUser(user)}>
                  Inspect
                </button>
              </div>
            </article>
          ))}
        </div>
        {selectedUser && (
          <div style={{ marginTop: 16 }}>
            <h3>{selectedUser.fullName || selectedUser.alias || selectedUser.email}</h3>
            <div className="invite-stack">
              <article className="invite-card">
                <div className="invite-card-header">
                  <div>
                    <strong>Password</strong>
                    <p>Password login availability for the selected user.</p>
                  </div>
                  <span className="status-chip">
                    {selectedMethods.passwordEnabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </article>
              {(selectedMethods.linkedProviders || []).map((method) => (
                <article className="invite-card" key={method.id}>
                  <div className="invite-card-header">
                    <div>
                      <strong>{formatMethod(method)}</strong>
                      <p>{method.subjectPreview || "Linked provider"}</p>
                    </div>
                    <span className="status-chip">Linked</span>
                  </div>
                </article>
              ))}
            </div>
            <div className="invite-stack" style={{ marginTop: 12 }}>
              <article className="invite-card">
                <div className="invite-card-header">
                  <div>
                    <strong>Sessions</strong>
                    <p>Revoke active sessions for the selected person.</p>
                  </div>
                  <button className="btn btn-danger" onClick={revokeAllUserSessions} type="button">
                    Revoke All
                  </button>
                </div>
              </article>
              {selectedSessions.map((row) => (
                <article className="invite-card" key={row.id}>
                  <div className="invite-card-header">
                    <div>
                      <strong>{row.revokedAt ? "Revoked session" : "Active session"}</strong>
                      <p>{row.userAgent || "Unknown device"}</p>
                    </div>
                    <span className="status-chip">{row.revokedAt ? "Revoked" : "Active"}</span>
                  </div>
                  <div className="invite-meta">
                    <span>Last used {row.lastUsedAt ? new Date(row.lastUsedAt).toLocaleString() : "Unknown"}</span>
                    <span>Expires {row.expiresAt ? new Date(row.expiresAt).toLocaleString() : "Unknown"}</span>
                  </div>
                  {!row.revokedAt ? (
                    <div className="actions">
                      <button
                        className="btn btn-danger"
                        onClick={() => revokeUserSession(row.id)}
                        type="button"
                      >
                        Revoke
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
              {!selectedSessions.length ? <div className="loading">No sessions found.</div> : null}
            </div>
            <div className="invite-stack" style={{ marginTop: 12 }}>
              {selectedAudits.map((audit) => (
                <article className="invite-card" key={audit.id}>
                  <div className="invite-card-header">
                    <div>
                      <strong>{audit.eventType}</strong>
                      <p>{formatAudit(audit)}</p>
                    </div>
                    <span className={`status-chip status-${audit.outcome || "unknown"}`}>
                      {audit.outcome || "unknown"}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
