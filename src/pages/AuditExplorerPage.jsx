import { Fragment, useMemo, useState } from "react";
import { ErrorBanner, SuccessBanner } from "../components/Feedback";
import { SearchPicker } from "../components/AdminControls";
import ScopeBadge from "../components/ScopeBadge";
import { toApiError } from "../lib/api";

const EXPLORER_TABS = [
  ["all", "All Events"],
  ["auth", "Auth And Invites"],
  ["public", "Public Poll Abuse"],
  ["support", "Support Actions"],
  ["sessions", "Session Activity"],
  ["backup", "Backup And Restore"],
  ["resources", "Resource Changes"],
];

const AUTH_SUPPORT_EVENTS = [
  "support_password_reset",
  "support_clear_2fa",
  "support_verify_account",
  "support_view_as_token_generated",
  "support_view_as_token_revoked",
  "support_ownership_transfer",
];

const RISKY_EVENTS = [
  ...AUTH_SUPPORT_EVENTS,
  "organization_invite_revoke",
  "public_poll_moderation_lock",
  "public_poll_moderation_remove_public_access",
  "public_poll_invite_blocked_trust",
  "public_poll_invite_blocked_suppression",
];

function downloadText(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  return JSON.stringify(String(value ?? ""));
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "Unknown";
}

function eventRisk(event) {
  if (event.outcome && !["success", "pending"].includes(event.outcome)) return "elevated";
  if (RISKY_EVENTS.includes(event.eventType)) return "high";
  if (event.source === "public") return "medium";
  return "normal";
}

function normalizeAuthAudit(audit) {
  return {
    ...audit,
    source: "auth",
    resourceId: audit.targetUserId || audit.actorUserId || audit.userId || audit.email || "",
    resourceType: "person",
    actor: audit.actorUserId || audit.email || "system",
    message: audit.message || audit.eventType || "Auth activity",
    raw: audit,
  };
}

function normalizePublicAudit(audit) {
  return {
    ...audit,
    source: "public",
    resourceId: audit.electionId || audit.metadata?.electionId || "",
    resourceType: "poll",
    actor: audit.actorUserId || audit.actorType || audit.metadata?.email || "guest",
    organizationId: audit.organizationId || audit.workgroup?.organizationId || "",
    message: audit.message || audit.eventType || "Public poll activity",
    raw: audit,
  };
}

function eventMatchesQuery(event, query) {
  if (!query) return true;
  const haystack = [
    event.id,
    event.eventType,
    event.outcome,
    event.actor,
    event.resourceId,
    event.organizationId,
    event.email,
    event.message,
  ].join(" ").toLowerCase();
  return haystack.includes(query.toLowerCase());
}

export default function AuditExplorerPage({
  api,
  session,
  initialOrganizationId = "",
  globalModeConfirmed = false,
  globalModeExpiresAt = 0,
}) {
  const [organizationId, setOrganizationId] = useState(initialOrganizationId || session?.organizationId || "");
  const [activeTab, setActiveTab] = useState("all");
  const [days, setDays] = useState(7);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [eventType, setEventType] = useState("");
  const [outcome, setOutcome] = useState("");
  const [actor, setActor] = useState("");
  const [affectedUserId, setAffectedUserId] = useState("");
  const [pollId, setPollId] = useState("");
  const [query, setQuery] = useState("");
  const [authEvents, setAuthEvents] = useState([]);
  const [publicEvents, setPublicEvents] = useState([]);
  const [expandedIds, setExpandedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canAccessAudit = session?.systemAdmin === true || session?.organizationAdmin === true;
  const effectiveOrganizationId =
    session?.systemAdmin === true ? organizationId.trim() : session?.organizationId || "";
  const isGlobalScope = session?.systemAdmin === true && !effectiveOrganizationId;
  const scopeParams = effectiveOrganizationId ? { organizationId: effectiveOrganizationId } : {};

  const combinedEvents = useMemo(() => {
    const merged = [
      ...authEvents.map(normalizeAuthAudit),
      ...publicEvents.map(normalizePublicAudit),
    ].map((event) => ({ ...event, risk: eventRisk(event) }));

    return merged
      .filter((event) => {
        if (activeTab === "auth") return event.source === "auth" && !AUTH_SUPPORT_EVENTS.includes(event.eventType);
        if (activeTab === "public") return event.source === "public";
        if (activeTab === "support") return AUTH_SUPPORT_EVENTS.includes(event.eventType) || event.eventType?.startsWith("public_poll_moderation");
        if (["sessions", "backup", "resources"].includes(activeTab)) return false;
        return true;
      })
      .filter((event) => eventMatchesQuery(event, query.trim()))
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [activeTab, authEvents, publicEvents, query]);

  function requireSafeScope() {
    if (!canAccessAudit) {
      setError("Support or admin access is required for audit exploration.");
      return false;
    }
    if (isGlobalScope && !globalModeConfirmed) {
      setError("Choose an organization or enable global mode before loading cross-tenant audit data.");
      return false;
    }
    if (isGlobalScope && Number(days) > 7) {
      setError("Global audit exploration is limited to 7 days. Narrow the window or choose a tenant.");
      return false;
    }
    return true;
  }

  function authParams() {
    return {
      ...scopeParams,
      days,
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
      ...(eventType.trim() ? { eventType: eventType.trim() } : {}),
      ...(outcome.trim() ? { outcome: outcome.trim() } : {}),
      ...(actor.trim() ? { userId: actor.trim() } : {}),
      ...(affectedUserId.trim() ? { userId: affectedUserId.trim() } : {}),
    };
  }

  function publicParams() {
    return {
      ...scopeParams,
      days,
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
      ...(eventType.trim() ? { eventType: eventType.trim() } : {}),
      ...(outcome.trim() ? { outcome: outcome.trim() } : {}),
      ...(actor.trim() ? { actorUserId: actor.trim() } : {}),
      ...(pollId.trim() ? { electionId: pollId.trim() } : {}),
    };
  }

  async function loadEvents() {
    if (!requireSafeScope()) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const [authResponse, publicResponse] = await Promise.all([
        api.get("/support/auth/audit", { params: { ...authParams(), page: 1, items: 100 } }),
        api.get("/support/publicpoll/audit", { params: { ...publicParams(), page: 1, items: 100 } }),
      ]);
      if (authResponse.status >= 400) throw toApiError(authResponse, "Failed to load auth audit events");
      if (publicResponse.status >= 400) throw toApiError(publicResponse, "Failed to load public poll audit events");
      setAuthEvents(authResponse.data?.data?.audits || []);
      setPublicEvents(publicResponse.data?.data?.audits || []);
      setSuccess("Audit explorer loaded current filters.");
    } catch (err) {
      setError(err.message || "Failed to load audit explorer");
    } finally {
      setLoading(false);
    }
  }

  async function exportCsv(kind = activeTab) {
    if (!requireSafeScope()) return;
    setError("");
    setSuccess("");
    try {
      if (kind === "auth" || kind === "public") {
        const response = await api.get(
          kind === "auth" ? "/support/auth/audit/export" : "/support/publicpoll/audit/export",
          { params: kind === "auth" ? authParams() : publicParams() }
        );
        if (response.status >= 400) throw toApiError(response, "Failed to export audit data");
        const data = response.data?.data || {};
        downloadText(data.filename || `wotlwedu-${kind}-audit.csv`, data.csv || "", "text/csv;charset=utf-8");
        setSuccess(`Exported ${data.total ?? 0} ${kind} audit rows.`);
        return;
      }
      const headers = ["source", "id", "createdAt", "eventType", "outcome", "risk", "actor", "resourceType", "resourceId", "organizationId", "message"];
      const rows = [headers.join(","), ...combinedEvents.map((event) => headers.map((key) => csvEscape(event[key])).join(","))];
      downloadText("wotlwedu-audit-explorer.csv", rows.join("\n"), "text/csv;charset=utf-8");
      setSuccess(`Exported ${combinedEvents.length} visible audit rows.`);
    } catch (err) {
      setError(err.message || "Failed to export audit data");
    }
  }

  function exportJson() {
    downloadText(
      "wotlwedu-audit-explorer.json",
      JSON.stringify(combinedEvents.map((event) => event.raw || event), null, 2),
      "application/json"
    );
    setSuccess(`Exported ${combinedEvents.length} visible audit rows as JSON.`);
  }

  async function copyRaw(event) {
    try {
      await navigator.clipboard.writeText(JSON.stringify(event.raw || event, null, 2));
      setSuccess("Copied raw audit metadata.");
    } catch {
      setError("Unable to copy raw audit metadata.");
    }
  }

  function toggleExpanded(id) {
    setExpandedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  if (!canAccessAudit) {
    return (
      <section className="panel">
        <h2>Audit Explorer</h2>
        <div className="empty-state">
          <strong>Audit access is restricted.</strong>
          <span>Use an organization admin or system admin session to explore audit events.</span>
        </div>
      </section>
    );
  }

  const unsupportedTab = ["sessions", "backup", "resources"].includes(activeTab);

  return (
    <div className="audit-explorer-page">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Audit Explorer</h2>
            <p className="muted-copy">One investigation timeline for the audit streams currently exposed by the backend.</p>
          </div>
          <ScopeBadge
            activeOrganizationId={effectiveOrganizationId}
            globalModeConfirmed={isGlobalScope && globalModeConfirmed}
            globalModeExpiresAt={globalModeExpiresAt}
          />
        </div>
        <ErrorBanner error={error} />
        <SuccessBanner message={success} />
        <div className="segmented-control audit-tabs" aria-label="Audit explorer views">
          {EXPLORER_TABS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={activeTab === key ? "segmented-active" : ""}
              onClick={() => setActiveTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="form-grid audit-filter-grid">
          {session?.systemAdmin ? (
            <label className="field">
              <span>Organization</span>
              <SearchPicker
                api={api}
                path="/organization"
                listKey="organizations"
                value={organizationId}
                onChange={setOrganizationId}
                placeholder="Search organizations"
              />
            </label>
          ) : null}
          <label className="field">
            <span>Window Days</span>
            <input type="number" min="1" max={isGlobalScope ? 7 : 90} value={days} onChange={(event) => setDays(Number(event.target.value) || 1)} />
          </label>
          <label className="field">
            <span>From</span>
            <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </label>
          <label className="field">
            <span>To</span>
            <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </label>
          <label className="field">
            <span>Event</span>
            <input value={eventType} onChange={(event) => setEventType(event.target.value)} placeholder="event type" />
          </label>
          <label className="field">
            <span>Outcome</span>
            <select value={outcome} onChange={(event) => setOutcome(event.target.value)}>
              <option value="">Any outcome</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
              <option value="blocked">Blocked</option>
              <option value="pending">Pending</option>
              <option value="flagged">Flagged</option>
            </select>
          </label>
          <label className="field">
            <span>Actor</span>
            <SearchPicker api={api} path="/person" listKey="users" value={actor} onChange={setActor} params={scopeParams} placeholder="Search actor" />
          </label>
          <label className="field">
            <span>Affected Person</span>
            <SearchPicker api={api} path="/person" listKey="users" value={affectedUserId} onChange={setAffectedUserId} params={scopeParams} placeholder="Search person" />
          </label>
          <label className="field">
            <span>Poll ID</span>
            <input value={pollId} onChange={(event) => setPollId(event.target.value)} />
          </label>
          <label className="field">
            <span>Search Results</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="actor, event, id, message" />
          </label>
        </div>
        <div className="filter-chip-row" aria-label="Audit explorer scope">
          <span className="filter-chip">Organization: {effectiveOrganizationId || "global"}</span>
          <span className="filter-chip">Loaded auth: {authEvents.length}</span>
          <span className="filter-chip">Loaded public: {publicEvents.length}</span>
          <span className="filter-chip">Visible: {combinedEvents.length}</span>
        </div>
        <div className="actions">
          <button className="btn" type="button" onClick={loadEvents} disabled={loading}>
            {loading ? "Loading..." : "Load Timeline"}
          </button>
          <button className="btn btn-secondary" type="button" onClick={() => exportCsv(activeTab)} disabled={unsupportedTab}>
            Export CSV
          </button>
          <button className="btn btn-secondary" type="button" onClick={exportJson} disabled={unsupportedTab}>
            Export JSON
          </button>
        </div>
        {isGlobalScope ? (
          <p className="muted-copy danger-text">
            Global audit exploration requires global mode and is limited to 7 days.
          </p>
        ) : null}
      </section>

      <section className="panel">
        <h2>{EXPLORER_TABS.find(([key]) => key === activeTab)?.[1] || "Timeline"}</h2>
        {unsupportedTab ? (
          <div className="empty-state">
            <strong>This stream is not available yet.</strong>
            <span>Backend audit coverage for this event family is not exposed as a queryable timeline yet.</span>
          </div>
        ) : combinedEvents.length ? (
          <div className="data-table-scroll audit-table-scroll">
            <table className="data-table audit-table data-table-audit audit-explorer-table">
              <thead>
                <tr>
                  <th>Created</th>
                  <th>Source</th>
                  <th>Event</th>
                  <th>Outcome</th>
                  <th>Risk</th>
                  <th>Actor</th>
                  <th>Target</th>
                  <th>Message</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {combinedEvents.map((event) => (
                  <Fragment key={event.id}>
                    <tr key={event.id}>
                      <td>{formatDate(event.createdAt)}</td>
                      <td>{event.source}</td>
                      <td>{event.eventType}</td>
                      <td><span className={`status-chip status-${event.outcome || "unknown"}`}>{event.outcome || "unknown"}</span></td>
                      <td><span className={`risk-chip risk-${event.risk}`}>{event.risk}</span></td>
                      <td>{event.actor}</td>
                      <td>{event.resourceType}: {event.resourceId || "unknown"}</td>
                      <td>{event.message}</td>
                      <td>
                        <div className="row-action-menu">
                          <button className="row-action-button" type="button" onClick={() => toggleExpanded(event.id)}>
                            {expandedIds.includes(event.id) ? "Hide" : "Expand"}
                          </button>
                          <button className="row-action-button" type="button" onClick={() => copyRaw(event)}>
                            Copy Raw
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedIds.includes(event.id) ? (
                      <tr key={`${event.id}-details`} className="audit-detail-row">
                        <td colSpan={9}>
                          <pre className="config-json">{JSON.stringify(event.raw || event, null, 2)}</pre>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <strong>No audit events loaded.</strong>
            <span>Load the timeline or broaden the filters to start an investigation.</span>
          </div>
        )}
      </section>
    </div>
  );
}
