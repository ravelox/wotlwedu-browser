import { useEffect, useState } from "react";
import Loading from "../components/Loading";
import { ErrorBanner } from "../components/Feedback";

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

  return (
    <div className="dashboard-grid">
      <ErrorBanner error={error} />
      <section className="panel">
        <h2>Backend Health</h2>
        <pre>{JSON.stringify(status, null, 2)}</pre>
      </section>
      <section className="panel">
        <h2>Ping</h2>
        <pre>{JSON.stringify(ping, null, 2)}</pre>
      </section>
      <section className="panel">
        <h2>Unread Notifications</h2>
        <div className="metric">{unread}</div>
      </section>
      {ops ? (
        <>
          <section className="panel">
            <h2>Tenant Scale</h2>
            <div className="metric">{ops.tenancy?.organizations ?? 0}</div>
            <p className="muted-line">
              {ops.tenancy?.users ?? 0} people | {ops.tenancy?.workgroups ?? 0} spaces
            </p>
          </section>
          <section className="panel">
            <h2>Active Sessions</h2>
            <div className="metric">{ops.sessions?.active ?? 0}</div>
            <p className="muted-line">{ops.sessions?.revoked ?? 0} revoked sessions</p>
          </section>
          <section className="panel">
            <h2>Mail Delivery</h2>
            <div className="metric">{ops.mail?.recentFailures24h ?? 0}</div>
            <p className="muted-line">{ops.mail?.provider || "configured"} failures in 24h</p>
          </section>
          <section className="panel">
            <h2>Storage</h2>
            <div className="metric">{ops.storage?.provider || "local"}</div>
            <p className="muted-line">
              S3 bucket {ops.storage?.s3BucketConfigured ? "configured" : "not configured"}
            </p>
          </section>
          <section className="panel">
            <h2>DB Updates</h2>
            <div className="metric">{ops.updates?.count ?? 0}</div>
            <p className="muted-line">metadata-tracked updates</p>
          </section>
        </>
      ) : null}
    </div>
  );
}
