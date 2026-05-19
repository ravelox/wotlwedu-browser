import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Loading from "../components/Loading";
import { ErrorBanner } from "../components/Feedback";

function healthLabel(status, ping, error) {
  if (error) return "Attention";
  if (!status && !ping) return "Unknown";
  return "Online";
}

function taskSeverity(value, warnAt = 1) {
  return Number(value || 0) >= warnAt ? "attention" : "normal";
}

function formatTime(value) {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  return date.toLocaleString();
}

export default function DashboardPage({ api, session, scope }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState(null);
  const [ping, setPing] = useState(null);
  const [unread, setUnread] = useState(0);
  const [ops, setOps] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const opsParams =
          scope?.activeOrganizationId || session?.organizationId
            ? { organizationId: scope?.activeOrganizationId || session?.organizationId }
            : {};
        const [statusRes, pingRes, unreadRes, opsRes] = await Promise.all([
          api.get("/helper/status"),
          api.get("/ping"),
          api.get("/notification/unreadcount"),
          session?.systemAdmin || session?.organizationAdmin
            ? api.get("/support/ops/overview", { params: opsParams })
            : Promise.resolve({ status: 204 }),
        ]);

        if (statusRes.status < 400) setStatus(statusRes.data);
        if (pingRes.status < 400) setPing(pingRes.data?.data || pingRes.data);
        if (unreadRes.status < 400) {
          const value = unreadRes.data?.count ?? unreadRes.data?.data?.count ?? 0;
          setUnread(value);
        }
        if (opsRes.status < 400) setOps(opsRes.data?.data || opsRes.data || null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [api, scope?.activeOrganizationId, session?.organizationAdmin, session?.organizationId, session?.systemAdmin]);

  if (loading) return <Loading text="Loading dashboard..." />;

  const canUseSupport = session?.systemAdmin || session?.organizationAdmin;
  const tasks = [
    {
      title: "Auth And Invite Failures",
      value: ops?.auth?.recentFailures24h ?? 0,
      detail: "Failures in the last 24 hours",
      to: "/support",
      action: "Review support feed",
      severity: taskSeverity(ops?.auth?.recentFailures24h),
      visible: canUseSupport,
    },
    {
      title: "Mail Delivery Failures",
      value: ops?.mail?.recentFailures24h ?? 0,
      detail: `${ops?.mail?.provider || "configured"} provider`,
      to: "/support",
      action: "Inspect delivery",
      severity: taskSeverity(ops?.mail?.recentFailures24h),
      visible: canUseSupport,
    },
    {
      title: "Active Sessions",
      value: ops?.sessions?.active ?? 0,
      detail: `${ops?.sessions?.revoked ?? 0} recently revoked`,
      to: "/support",
      action: "Investigate sessions",
      severity: "normal",
      visible: canUseSupport,
    },
    {
      title: "Unread Notifications",
      value: unread,
      detail: "Current account notifications",
      to: "/notifications",
      action: "Open notifications",
      severity: taskSeverity(unread),
      visible: true,
    },
    {
      title: "People And Spaces",
      value: ops?.tenancy?.users ?? 0,
      detail: `${ops?.tenancy?.workgroups ?? 0} spaces across ${ops?.tenancy?.organizations ?? 0} organizations`,
      to: "/people",
      action: "Open people",
      severity: "normal",
      visible: Boolean(ops?.tenancy),
    },
    {
      title: "Backup Readiness",
      value: ops?.updates?.count ?? 0,
      detail: "Metadata-tracked database updates",
      to: "/backup",
      action: "Run scoped backup",
      severity: "normal",
      visible: canUseSupport,
    },
    {
      title: "Storage Provider",
      value: ops?.storage?.imageCount ?? ops?.storage?.provider ?? "local",
      detail: `Media provider: ${ops?.storage?.provider || "local"}; S3 bucket ${
        ops?.storage?.s3BucketConfigured ? "configured" : "not configured"
      }`,
      to: "/pictures",
      action: "Open pictures",
      severity: ops?.storage?.provider === "s3" && !ops?.storage?.s3BucketConfigured ? "attention" : "normal",
      visible: Boolean(ops?.storage),
    },
  ].filter((task) => task.visible);
  const backendHealth = healthLabel(status, ping, error);
  const lastUpdated = formatTime(new Date().toISOString());
  const activeOrganizationId = scope?.activeOrganizationId || session?.organizationId || "";
  const setupItems = [
    {
      label: "Backend health confirmed",
      done: backendHealth === "Online",
      to: "/dashboard",
    },
    {
      label: "Organization scope selected",
      done: Boolean(activeOrganizationId) || session?.systemAdmin !== true,
      to: "/organizations",
    },
    {
      label: "Roles and capabilities review available",
      done: session?.systemAdmin === true || session?.organizationAdmin === true,
      to: "/roles",
    },
    {
      label: "Scoped backup destination ready",
      done: canUseSupport && (Boolean(activeOrganizationId) || session?.systemAdmin === true),
      to: "/backup",
    },
    {
      label: "Auth failure review available",
      done: canUseSupport,
      to: "/support",
    },
  ];

  return (
    <div className="dashboard-stack">
      <ErrorBanner error={error} />
      <section className="panel dashboard-summary">
        <div>
          <h2>Admin Action Center</h2>
          <p className="muted-copy">
            Backend {backendHealth.toLowerCase()} | Last updated {lastUpdated}
          </p>
        </div>
        <span className={`status-chip status-${backendHealth === "Online" ? "success" : "blocked"}`}>
          {backendHealth}
        </span>
      </section>

      <section className="panel">
        <div className="section-header-row">
          <div>
            <h2>First-Run Diagnostics</h2>
            <p className="muted-copy">
              Confirm the console has a healthy backend, a clear tenant scope, and a safe first backup path.
            </p>
          </div>
        </div>
        <div className="checklist-grid">
          {setupItems.map((item) => (
            <Link className="checklist-item" key={item.label} to={item.to}>
              <span className={`checkmark ${item.done ? "checkmark-done" : ""}`}>
                {item.done ? "OK" : "Todo"}
              </span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="task-grid">
        {tasks.map((task) => (
          <article className={`task-card task-card-${task.severity}`} key={task.title}>
            <div>
              <span className="task-label">{task.title}</span>
              <div className="metric">{task.value}</div>
              <p className="muted-line">{task.detail}</p>
            </div>
            <Link className="btn btn-secondary" to={task.to}>
              {task.action}
            </Link>
          </article>
        ))}
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <h2>Health Summary</h2>
          <div className="metric metric-small">{backendHealth}</div>
          <p className="muted-line">
            Ping: {ping?.message || ping?.status || (ping ? "OK" : "Unknown")}
          </p>
          <details className="diagnostic-details">
            <summary>Raw backend health</summary>
            <pre>{JSON.stringify(status, null, 2)}</pre>
          </details>
          <details className="diagnostic-details">
            <summary>Raw ping</summary>
            <pre>{JSON.stringify(ping, null, 2)}</pre>
          </details>
        </article>
        {canUseSupport ? (
          <article className="panel">
            <h2>Support Shortcuts</h2>
            <div className="dashboard-actions">
              <Link className="btn btn-secondary" to="/support">
                Open Support
              </Link>
              <Link className="btn btn-secondary" to="/backup">
                Open Backup
              </Link>
              <Link className="btn btn-secondary" to="/configuration">
                Open Config
              </Link>
            </div>
          </article>
        ) : null}
      </section>

      <section className="panel">
        <h2>Glossary</h2>
        <div className="glossary-grid">
          <details>
            <summary>Space</summary>
            <p className="muted-line">A workgroup-scoped area for people, polls, lists, items, and pictures.</p>
          </details>
          <details>
            <summary>Circle</summary>
            <p className="muted-line">A reusable group of people used by older API surfaces and admin resource screens.</p>
          </details>
          <details>
            <summary>Poll</summary>
            <p className="muted-line">The user-facing decision workflow; legacy API resources may still call it an election.</p>
          </details>
          <details>
            <summary>Category Owner</summary>
            <p className="muted-line">The person whose personal category set can be assigned to compatible resources.</p>
          </details>
          <details>
            <summary>Global Mode</summary>
            <p className="muted-line">A short-lived system-admin state for cross-tenant support work.</p>
          </details>
          <details>
            <summary>Protected Role</summary>
            <p className="muted-line">A built-in role that can be inspected but not deleted from the console.</p>
          </details>
        </div>
      </section>
    </div>
  );
}
