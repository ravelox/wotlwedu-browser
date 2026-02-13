import { useEffect, useState } from "react";
import Loading from "../components/Loading";
import { ErrorBanner } from "../components/Feedback";

export default function DashboardPage({ api }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState(null);
  const [ping, setPing] = useState(null);
  const [unread, setUnread] = useState(0);
  const [defaults, setDefaults] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [statusRes, pingRes, unreadRes, defaultsRes] = await Promise.all([
          api.get("/helper/status"),
          api.get("/ping"),
          api.get("/notification/unreadcount"),
          api.get("/ai/preferences/defaults"),
        ]);

        if (statusRes.status < 400) setStatus(statusRes.data);
        if (pingRes.status < 400) setPing(pingRes.data?.data || pingRes.data);
        if (unreadRes.status < 400) {
          const value = unreadRes.data?.count ?? unreadRes.data?.data?.count ?? 0;
          setUnread(value);
        }
        if (defaultsRes.status < 400) {
          setDefaults(defaultsRes.data?.data || defaultsRes.data);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [api]);

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
      <section className="panel">
        <h2>AI Smart Defaults</h2>
        <pre>{JSON.stringify(defaults, null, 2)}</pre>
      </section>
    </div>
  );
}
