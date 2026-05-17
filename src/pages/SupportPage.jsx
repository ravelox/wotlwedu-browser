import { useEffect, useState } from "react";
import { ErrorBanner, SuccessBanner } from "../components/Feedback";
import { toApiError } from "../lib/api";
import {
  ConfirmActionModal,
  PaginationControls,
  SearchPicker,
} from "../components/AdminControls";
import ScopeBadge from "../components/ScopeBadge";

function formatAudit(audit) {
  if (!audit) return "Unknown activity";
  return audit.message || `${audit.eventType || "activity"} ${audit.provider || ""}`.trim();
}

function formatMethod(method) {
  if (!method) return "Unknown";
  return `${method.provider || "provider"}${method.email ? ` • ${method.email}` : ""}`;
}

const OWNERSHIP_RESOURCES = [
  "categories",
  "groups",
  "images",
  "items",
  "lists",
  "workgroups",
  "elections",
];

export default function SupportPage({
  api,
  session,
  initialOrganizationId = "",
  globalModeConfirmed = false,
  globalModeExpiresAt = 0,
  onChangeGlobalModeConfirmed,
  onGlobalModeUsed,
}) {
  const [organizationId, setOrganizationId] = useState(
    initialOrganizationId || session?.organizationId || ""
  );
  const [days, setDays] = useState(7);
  const [eventType, setEventType] = useState("");
  const [outcome, setOutcome] = useState("");
  const [provider, setProvider] = useState("");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [overview, setOverview] = useState(null);
  const [opsOverview, setOpsOverview] = useState(null);
  const [audits, setAudits] = useState([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const [publicOverview, setPublicOverview] = useState(null);
  const [publicAudits, setPublicAudits] = useState([]);
  const [publicAuditPage, setPublicAuditPage] = useState(1);
  const [publicAuditTotal, setPublicAuditTotal] = useState(0);
  const [publicPollId, setPublicPollId] = useState("");
  const [moderationReason, setModerationReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedMethods, setSelectedMethods] = useState({
    passwordEnabled: false,
    linkedProviders: [],
  });
  const [selectedAudits, setSelectedAudits] = useState([]);
  const [selectedSessions, setSelectedSessions] = useState([]);
  const [recoveryResult, setRecoveryResult] = useState(null);
  const [transferTargetUserId, setTransferTargetUserId] = useState("");
  const [transferResources, setTransferResources] = useState(["items", "lists", "elections"]);
  const [transferIncludeLinked, setTransferIncludeLinked] = useState(true);
  const [transferPreview, setTransferPreview] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canAccessSupport =
    session?.systemAdmin === true || session?.organizationAdmin === true;

  useEffect(() => {
    if (initialOrganizationId) setOrganizationId(initialOrganizationId);
  }, [initialOrganizationId]);

  const effectiveOrganizationId =
    session?.systemAdmin === true ? organizationId.trim() : session?.organizationId || "";
  const isGlobalScope = session?.systemAdmin === true && !effectiveOrganizationId;
  const globalConfirmed = Boolean(globalModeConfirmed);
  const scopeParams = effectiveOrganizationId ? { organizationId: effectiveOrganizationId } : {};

  function requireSafeScope() {
    if (!canAccessSupport) return false;
    if (isGlobalScope && !globalConfirmed) {
      setError("Choose an organization or explicitly confirm global support mode before loading data.");
      return false;
    }
    if (isGlobalScope && Number(days) > 7) {
      setError("Global support investigations are limited to 7 days. Narrow the window or choose a tenant.");
      return false;
    }
    return true;
  }

  async function loadSupportData(nextAuditPage = auditPage, nextPublicAuditPage = publicAuditPage) {
    if (!canAccessSupport) return;
    if (!requireSafeScope()) return;
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
      const [overviewResponse, auditResponse, opsResponse] = await Promise.all([
        api.get("/support/auth/overview", { params }),
        api.get("/support/auth/audit", {
          params: { ...params, items: 25, page: nextAuditPage },
        }),
        api.get("/support/ops/overview", { params: scopeParams }),
      ]);
      if (overviewResponse.status >= 400) {
        throw toApiError(overviewResponse, "Failed to load support overview");
      }
      if (auditResponse.status >= 400) {
        throw toApiError(auditResponse, "Failed to load support audit feed");
      }
      if (opsResponse.status >= 400) {
        throw toApiError(opsResponse, "Failed to load operations dashboard");
      }
      setOverview(overviewResponse.data?.data || null);
      setOpsOverview(opsResponse.data?.data || null);
      setAudits(auditResponse.data?.data?.audits || []);
      setAuditPage(auditResponse.data?.data?.page || nextAuditPage);
      setAuditTotal(auditResponse.data?.data?.total || 0);
      const publicParams = {
        ...scopeParams,
        days,
        ...(publicPollId.trim() ? { electionId: publicPollId.trim() } : {}),
      };
      const [publicOverviewResponse, publicAuditResponse] = await Promise.all([
        api.get("/support/publicpoll/overview", { params: publicParams }),
        api.get("/support/publicpoll/audit", {
          params: { ...publicParams, items: 25, page: nextPublicAuditPage },
        }),
      ]);
      if (publicOverviewResponse.status >= 400) {
        throw toApiError(publicOverviewResponse, "Failed to load public poll overview");
      }
      if (publicAuditResponse.status >= 400) {
        throw toApiError(publicAuditResponse, "Failed to load public poll audit feed");
      }
      setPublicOverview(publicOverviewResponse.data?.data || null);
      setPublicAudits(publicAuditResponse.data?.data?.audits || []);
      setPublicAuditPage(publicAuditResponse.data?.data?.page || nextPublicAuditPage);
      setPublicAuditTotal(publicAuditResponse.data?.data?.total || 0);
    } catch (err) {
      setError(err.message || "Failed to load support data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (session?.organizationAdmin === true) loadSupportData(1, 1).catch(() => {});
  }, [session?.organizationId, session?.organizationAdmin]);

  async function searchUsers(event) {
    event.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    if (!requireSafeScope()) return;
    setError("");
    setSuccess("");
    try {
      const response = await api.get("/person", {
        params: {
          ...scopeParams,
          page: 1,
          items: 25,
          filter: searchQuery.trim(),
        },
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
      setRecoveryResult(null);
      setTransferPreview(null);
      setTransferTargetUserId("");
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
      return true;
    } catch (err) {
      setError(err.message || "Failed to revoke session");
      return false;
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
      return true;
    } catch (err) {
      setError(err.message || "Failed to revoke sessions");
      return false;
    }
  }

  async function moderatePublicPoll(electionId, action, reasonOverride = "") {
    if (!electionId) return;
    setError("");
    setSuccess("");
    try {
      const response = await api.post(`/support/publicpoll/${electionId}/moderation`, {
        action,
        reason: reasonOverride || moderationReason || "support console action",
      });
      if (response.status >= 400) {
        throw toApiError(response, "Failed to moderate public poll");
      }
      setSuccess("Public poll moderation action applied.");
      await loadSupportData();
      return true;
    } catch (err) {
      setError(err.message || "Failed to moderate public poll");
      return false;
    }
  }

  async function suppressRecipient(emailToSuppress, electionId, reasonOverride = "") {
    if (!emailToSuppress) return;
    setError("");
    setSuccess("");
    try {
      const response = await api.post("/support/publicpoll/suppression", {
        email: emailToSuppress,
        electionId,
        reason: reasonOverride || moderationReason || "support moderation",
      });
      if (response.status >= 400) {
        throw toApiError(response, "Failed to suppress recipient");
      }
      setSuccess("Recipient suppressed for public-poll invites.");
      await loadSupportData();
      return true;
    } catch (err) {
      setError(err.message || "Failed to suppress recipient");
      return false;
    }
  }

  async function runRecoveryAction(action, reasonOverride = "") {
    if (!selectedUser?.id) return;
    setError("");
    setSuccess("");
    setRecoveryResult(null);
    try {
      const path =
        action === "password-reset"
          ? `/support/people/${selectedUser.id}/recovery/password-reset`
          : action === "clear-2fa"
            ? `/support/people/${selectedUser.id}/recovery/clear-2fa`
            : `/support/people/${selectedUser.id}/recovery/verify`;
      const response = await api.post(path, {
        reason: reasonOverride || "support console recovery",
        sendEmail: true,
      });
      if (response.status >= 400) {
        throw toApiError(response, "Failed to run recovery action");
      }
      const recovery = response.data?.data?.recovery || null;
      setSuccess("Recovery action completed.");
      await inspectUser(selectedUser);
      setRecoveryResult(recovery);
      return true;
    } catch (err) {
      setError(err.message || "Failed to run recovery action");
      return false;
    }
  }

  async function previewOwnershipTransfer() {
    if (!selectedUser?.id || !transferTargetUserId) return;
    setError("");
    setSuccess("");
    try {
      const response = await api.get(`/support/people/${selectedUser.id}/ownership/preview`, {
        params: {
          ownerId: transferTargetUserId,
          includeLinked: transferIncludeLinked ? "true" : "false",
          resources: transferResources.join(","),
        },
      });
      if (response.status >= 400) {
        throw toApiError(response, "Failed to preview ownership transfer");
      }
      setTransferPreview(response.data?.data?.transfer || null);
    } catch (err) {
      setError(err.message || "Failed to preview ownership transfer");
    }
  }

  async function applyOwnershipTransfer(reasonOverride = "") {
    if (!selectedUser?.id || !transferTargetUserId) return;
    setError("");
    setSuccess("");
    try {
      const response = await api.post(`/support/people/${selectedUser.id}/ownership/transfer`, {
        ownerId: transferTargetUserId,
        includeLinked: transferIncludeLinked,
        resources: transferResources,
        reason: reasonOverride || "support ownership remediation",
      });
      if (response.status >= 400) {
        throw toApiError(response, "Failed to transfer ownership");
      }
      const transfer = response.data?.data?.transfer || null;
      setSuccess("Ownership transferred.");
      await inspectUser(selectedUser);
      setTransferPreview(transfer);
      return true;
    } catch (err) {
      setError(err.message || "Failed to transfer ownership");
      return false;
    }
  }

  async function executeConfirmed(reason) {
    const action = confirmAction;
    if (!action) return;
    setConfirmAction(null);
    let completed = false;
    if (action.kind === "moderate") {
      completed = await moderatePublicPoll(action.electionId, action.action, reason);
    } else if (action.kind === "suppress-recipient") {
      completed = await suppressRecipient(action.email, action.electionId, reason);
    } else if (action.kind === "revoke-session") {
      completed = await revokeUserSession(action.sessionId);
    } else if (action.kind === "revoke-all-sessions") {
      completed = await revokeAllUserSessions();
    } else if (action.kind === "recovery") {
      completed = await runRecoveryAction(action.action, reason);
    } else if (action.kind === "ownership-transfer") {
      completed = await applyOwnershipTransfer(reason);
    }
    if (completed && isGlobalScope && globalConfirmed) {
      onGlobalModeUsed?.();
    }
  }

  function downloadCsv(filename, csv) {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportCsv(filename, rows) {
    const headers = ["id", "createdAt", "eventType", "outcome", "organizationId", "email", "message"];
    const csvRows = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((key) => JSON.stringify(String(row?.[key] ?? "")))
          .join(",")
      ),
    ];
    downloadCsv(filename, csvRows.join("\n"));
  }

  async function exportAudit(kind) {
    if (!requireSafeScope()) return;
    setError("");
    setSuccess("");
    try {
      const params =
        kind === "auth"
          ? {
              ...scopeParams,
              ...(eventType.trim() ? { eventType: eventType.trim() } : {}),
              ...(outcome.trim() ? { outcome: outcome.trim() } : {}),
              ...(provider.trim() ? { provider: provider.trim() } : {}),
              ...(email.trim() ? { email: email.trim() } : {}),
              ...(userId.trim() ? { userId: userId.trim() } : {}),
            }
          : {
              ...scopeParams,
              ...(publicPollId.trim() ? { electionId: publicPollId.trim() } : {}),
            };
      const response = await api.get(
        kind === "auth" ? "/support/auth/audit/export" : "/support/publicpoll/audit/export",
        { params }
      );
      if (response.status >= 400) {
        throw toApiError(response, "Failed to export audit data");
      }
      const data = response.data?.data || {};
      downloadCsv(data.filename || `wotlwedu-${kind}-audit.csv`, data.csv || "");
      setSuccess(`Exported ${data.total ?? 0} audit rows.`);
    } catch (err) {
      setError(err.message || "Failed to export audit data");
    }
  }

  function toggleTransferResource(resource) {
    setTransferResources((current) =>
      current.includes(resource)
        ? current.filter((item) => item !== resource)
        : [...current, resource]
    );
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
              <span>Organization Scope</span>
              <SearchPicker
                api={api}
                path="/organization"
                listKey="organizations"
                value={organizationId}
                onChange={(value) => {
                  setOrganizationId(value);
                  onChangeGlobalModeConfirmed?.(false);
                }}
                placeholder="Search organizations"
              />
            </label>
          )}
          {session?.systemAdmin === true && !organizationId.trim() && (
            <label className="field checkbox-field">
              <input
                type="checkbox"
                checked={globalConfirmed}
                onChange={(event) => onChangeGlobalModeConfirmed?.(event.target.checked)}
              />
              <span>Enable global writes for 15 minutes with a 7-day maximum window</span>
            </label>
          )}
          <label className="field">
            <span>Window (days)</span>
            <input
              type="number"
              min={1}
              max={30}
              value={days}
              onChange={(e) => setDays(Math.min(Number(e.target.value) || 7, isGlobalScope ? 7 : 30))}
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
            <SearchPicker
              api={api}
              path="/person"
              listKey="users"
              value={userId}
              onChange={setUserId}
              params={scopeParams}
              placeholder="Search person"
            />
          </label>
        </div>
        <div className="actions">
          <button
            className="btn"
            type="button"
            onClick={() => loadSupportData(1, 1)}
            title="Load support data for the selected filters and scope"
          >
            Load Scoped Data
          </button>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => exportAudit("auth")}
            title="Export authentication audit results as CSV"
          >
            Export Auth CSV
          </button>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => exportAudit("public")}
            title="Export public poll audit results as CSV"
          >
            Export Public CSV
          </button>
        </div>
        <div className="scope-banner">
          <strong>Scope</strong>
          <ScopeBadge
            activeOrganizationId={effectiveOrganizationId}
            globalModeConfirmed={isGlobalScope && globalConfirmed}
            globalModeExpiresAt={globalModeExpiresAt}
          />
          <span>Organization: {effectiveOrganizationId || "global"}</span>
          <span>Window: {days} day{Number(days) === 1 ? "" : "s"}</span>
          {isGlobalScope ? (
            <span className="danger-text">
              {globalConfirmed ? "Global write mode resets after confirmed support actions." : "Global scope is read-only until enabled."}
            </span>
          ) : null}
        </div>
      </section>

      <section className="panel">
        <h2>Operations Dashboards</h2>
        <div className="dashboard-grid">
          <article className="panel">
            <h3>Auth / Invites</h3>
            <div className="metric">{opsOverview?.auth?.recentFailures24h ?? 0}</div>
            <p className="muted-line">auth or invite failures in 24h</p>
          </article>
          <article className="panel">
            <h3>Mail Delivery</h3>
            <div className="metric">{opsOverview?.mail?.recentFailures24h ?? 0}</div>
            <p className="muted-line">{opsOverview?.mail?.provider || "configured"} provider</p>
          </article>
          <article className="panel">
            <h3>Storage Usage</h3>
            <div className="metric">{opsOverview?.storage?.imageCount ?? 0}</div>
            <p className="muted-line">{opsOverview?.storage?.provider || "local"} media provider</p>
          </article>
          <article className="panel">
            <h3>DB Updates</h3>
            <div className="metric">{opsOverview?.updates?.count ?? 0}</div>
            <p className="muted-line">metadata-tracked migrations</p>
          </article>
          <article className="panel">
            <h3>Active Sessions</h3>
            <div className="metric">{opsOverview?.sessions?.active ?? 0}</div>
            <p className="muted-line">{opsOverview?.sessions?.revoked ?? 0} revoked sessions</p>
          </article>
          <article className="panel">
            <h3>Public Poll Abuse</h3>
            <div className="metric">{publicOverview?.totals?.reportCount ?? 0}</div>
            <p className="muted-line">{publicOverview?.totals?.blockedCount ?? 0} blocked invite events</p>
          </article>
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
        <h2>Public Poll Abuse</h2>
        <div className="form-grid">
          <label className="field">
            <span>Poll ID</span>
            <input value={publicPollId} onChange={(e) => setPublicPollId(e.target.value)} />
          </label>
          <label className="field">
            <span>Moderation Reason</span>
            <input
              value={moderationReason}
              onChange={(e) => setModerationReason(e.target.value)}
              placeholder="Visible in audit metadata"
            />
          </label>
        </div>
        <div className="dashboard-grid" style={{ marginTop: 12 }}>
          <article className="panel">
            <h3>Total Events</h3>
            <div className="metric">{publicOverview?.totals?.totalEvents ?? 0}</div>
          </article>
          <article className="panel">
            <h3>Reports</h3>
            <div className="metric">{publicOverview?.totals?.reportCount ?? 0}</div>
          </article>
          <article className="panel">
            <h3>Blocked</h3>
            <div className="metric">{publicOverview?.totals?.blockedCount ?? 0}</div>
          </article>
          <article className="panel">
            <h3>Public Polls</h3>
            <div className="metric">{publicOverview?.totals?.uniqueElections ?? 0}</div>
          </article>
        </div>
        <div className="invite-stack" style={{ marginTop: 12 }}>
          {publicAudits.length ? (
            publicAudits.map((audit) => (
              <article className="invite-card" key={audit.id}>
                <div className="invite-card-header">
                  <div>
                    <strong>{audit.election?.name || audit.electionId || audit.eventType}</strong>
                    <p>{formatAudit(audit)}</p>
                  </div>
                  <span className={`status-chip status-${audit.outcome || "unknown"}`}>
                    {audit.outcome || "unknown"}
                  </span>
                </div>
                <div className="invite-meta">
                  <span>{audit.eventType}</span>
                  <span>{audit.createdAt ? new Date(audit.createdAt).toLocaleString() : "Unknown"}</span>
                  {audit.election?.abuseStatus ? <span>{audit.election.abuseStatus}</span> : null}
                </div>
                {audit.electionId ? (
                  <div className="actions">
                    <button
                      className="btn btn-danger"
                      onClick={() => setConfirmAction({
                        kind: "moderate",
                        action: "lock",
                        electionId: audit.electionId,
                        title: "Lock public poll",
                        tenant: audit.workgroup?.organizationId || effectiveOrganizationId || "Global / cross-tenant",
                        target: audit.electionId,
                        impact: "Public access remains visible but voting/invite activity is locked.",
                      })}
                      type="button"
                    >
                      Lock
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setConfirmAction({
                        kind: "moderate",
                        action: "restore",
                        electionId: audit.electionId,
                        title: "Restore public poll",
                        tenant: audit.workgroup?.organizationId || effectiveOrganizationId || "Global / cross-tenant",
                        target: audit.electionId,
                        impact: "The public poll is returned to normal trust status.",
                      })}
                      type="button"
                    >
                      Restore
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setConfirmAction({
                        kind: "moderate",
                        action: "remove_public_access",
                        electionId: audit.electionId,
                        title: "Remove public access",
                        tenant: audit.workgroup?.organizationId || effectiveOrganizationId || "Global / cross-tenant",
                        target: audit.electionId,
                        impact: "The public link is disabled and anonymous access is removed.",
                      })}
                      type="button"
                    >
                      Remove Public Access
                    </button>
                    {(audit.metadata?.email || audit.metadata?.recipientEmail) ? (
                      <button
                        className="btn btn-danger"
                        onClick={() => setConfirmAction({
                          kind: "suppress-recipient",
                          email: audit.metadata?.email || audit.metadata?.recipientEmail,
                          electionId: audit.electionId,
                          title: "Suppress recipient",
                          tenant: audit.workgroup?.organizationId || effectiveOrganizationId || "Global / cross-tenant",
                          target: audit.metadata?.email || audit.metadata?.recipientEmail,
                          impact: "Future public-poll invites to this email address will be blocked.",
                        })}
                        type="button"
                      >
                        Suppress Recipient
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </article>
            ))
          ) : (
            <p style={{ color: "var(--muted)" }}>No public poll abuse events matched the current filter.</p>
          )}
        </div>
        <PaginationControls
          page={publicAuditPage}
          itemsPerPage={25}
          total={publicAuditTotal}
          onPageChange={(nextPage) => loadSupportData(auditPage, nextPage)}
        />
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
        <PaginationControls
          page={auditPage}
          itemsPerPage={25}
          total={auditTotal}
          onPageChange={(nextPage) => loadSupportData(nextPage, publicAuditPage)}
        />
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
                    <strong>Account Recovery</strong>
                    <p>Generate recovery links, clear blocked sign-in factors, and verify access after support review.</p>
                  </div>
                </div>
                <div className="actions">
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => setConfirmAction({
                      kind: "recovery",
                      action: "password-reset",
                      title: "Send password reset",
                      tenant: selectedUser.organizationId || effectiveOrganizationId || "Global / cross-tenant",
                      target: selectedUser.id,
                      impact: "A password reset token is generated and emailed to the selected person.",
                    })}
                  >
                    Send Reset
                  </button>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => setConfirmAction({
                      kind: "recovery",
                      action: "clear-2fa",
                      title: "Clear two-factor authentication",
                      tenant: selectedUser.organizationId || effectiveOrganizationId || "Global / cross-tenant",
                      target: selectedUser.id,
                      impact: "Two-factor authentication is disabled for the selected person.",
                    })}
                  >
                    Clear 2FA
                  </button>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => setConfirmAction({
                      kind: "recovery",
                      action: "verify",
                      title: "Verify and activate account",
                      tenant: selectedUser.organizationId || effectiveOrganizationId || "Global / cross-tenant",
                      target: selectedUser.id,
                      impact: "The selected account is marked verified and active.",
                    })}
                  >
                    Verify Account
                  </button>
                </div>
                {recoveryResult?.resetUrl ? (
                  <label className="field field-full" style={{ marginTop: 12 }}>
                    <span>Recovery Link</span>
                    <input value={recoveryResult.resetUrl} readOnly />
                  </label>
                ) : null}
              </article>

              <article className="invite-card">
                <div className="invite-card-header">
                  <div>
                    <strong>Ownership Remediation</strong>
                    <p>Move resource ownership to another person in the same organization before deactivation or cleanup.</p>
                  </div>
                </div>
                <div className="form-grid">
                  <label className="field">
                    <span>New Owner</span>
                    <SearchPicker
                      api={api}
                      path="/person"
                      listKey="users"
                      value={transferTargetUserId}
                      onChange={setTransferTargetUserId}
                      params={selectedUser.organizationId ? { organizationId: selectedUser.organizationId } : scopeParams}
                      placeholder="Search people"
                    />
                  </label>
                  <label className="field checkbox-field">
                    <input
                      type="checkbox"
                      checked={transferIncludeLinked}
                      onChange={(event) => setTransferIncludeLinked(event.target.checked)}
                    />
                    <span>Include linked ownership fields</span>
                  </label>
                </div>
                <div className="actions">
                  {OWNERSHIP_RESOURCES.map((resource) => (
                    <label className="checkbox-field compact-checkbox" key={resource}>
                      <input
                        type="checkbox"
                        checked={transferResources.includes(resource)}
                        onChange={() => toggleTransferResource(resource)}
                      />
                      <span>{resource}</span>
                    </label>
                  ))}
                </div>
                <div className="actions">
                  <button
                    className="btn btn-secondary"
                    type="button"
                    disabled={!transferTargetUserId || !transferResources.length}
                    onClick={previewOwnershipTransfer}
                  >
                    Preview Transfer
                  </button>
                  <button
                    className="btn btn-danger"
                    type="button"
                    disabled={!transferPreview || !transferTargetUserId}
                    onClick={() => setConfirmAction({
                      kind: "ownership-transfer",
                      title: "Transfer ownership",
                      tenant: selectedUser.organizationId || effectiveOrganizationId || "Global / cross-tenant",
                      target: `${selectedUser.id} to ${transferTargetUserId}`,
                      impact: "Selected resource ownership is reassigned. This action is audit logged.",
                    })}
                  >
                    Apply Transfer
                  </button>
                </div>
                {transferPreview ? (
                  <div className="scope-banner" style={{ marginTop: 12 }}>
                    <strong>Preview</strong>
                    <span>
                      Direct: {Object.values(transferPreview.direct || {}).reduce((sum, value) => sum + Number(value || 0), 0)}
                    </span>
                    <span>
                      Linked: {Object.values(transferPreview.linked || {}).reduce((sum, value) => sum + Number(value || 0), 0)}
                    </span>
                    <span>Resources: {(transferPreview.resources || []).join(", ") || "none"}</span>
                  </div>
                ) : null}
              </article>

              <article className="invite-card">
                <div className="invite-card-header">
                  <div>
                    <strong>Sessions</strong>
                    <p>Revoke active sessions for the selected person.</p>
                  </div>
                  <button
                    className="btn btn-danger"
                    onClick={() => setConfirmAction({
                      kind: "revoke-all-sessions",
                      title: "Revoke all sessions",
                      tenant: selectedUser.organizationId || effectiveOrganizationId || "Global / cross-tenant",
                      target: selectedUser.id,
                      impact: "The selected person is signed out everywhere.",
                    })}
                    type="button"
                  >
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
                        onClick={() => setConfirmAction({
                          kind: "revoke-session",
                          sessionId: row.id,
                          title: "Revoke session",
                          tenant: selectedUser.organizationId || effectiveOrganizationId || "Global / cross-tenant",
                          target: row.id,
                          impact: "The selected person is signed out from this session.",
                        })}
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
      <ConfirmActionModal
        action={confirmAction}
        onCancel={() => setConfirmAction(null)}
        onConfirm={executeConfirmed}
      />
    </div>
  );
}
