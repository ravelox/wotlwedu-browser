import { useEffect, useMemo, useState } from "react";
import { ErrorBanner } from "../components/Feedback";
import { toApiError } from "../lib/api";

function formatValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value, null, 2);
}

function getValueKind(value) {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
}

export default function ConfigPage({ api, session }) {
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");

  const entries = useMemo(() => {
    const config = snapshot?.config || {};
    const normalizedFilter = filter.trim().toLowerCase();
    return Object.entries(config)
      .sort(([left], [right]) => left.localeCompare(right))
      .filter(([key, value]) => {
        if (!normalizedFilter) return true;
        return (
          key.toLowerCase().includes(normalizedFilter) ||
          formatValue(value).toLowerCase().includes(normalizedFilter)
        );
      });
  }, [filter, snapshot]);

  const loadConfig = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/admin/config");
      if (response.status >= 400) {
        throw toApiError(response, "Failed to load configuration");
      }
      setSnapshot(response.data?.data || response.data || null);
    } catch (err) {
      setError(err.message || "Failed to load configuration");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.systemAdmin !== true) return;
    loadConfig();
  }, [api, session?.systemAdmin]);

  if (session?.systemAdmin !== true) {
    return (
      <div className="panel">
        <h2>Configuration</h2>
        <ErrorBanner error="System admin access required." />
      </div>
    );
  }

  return (
    <div className="config-page">
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Configuration</h2>
            <p className="muted-copy">
              {snapshot?.generatedAt
                ? `Generated ${new Date(snapshot.generatedAt).toLocaleString()}`
                : "Runtime backend configuration"}
            </p>
          </div>
          <button className="btn btn-secondary" type="button" onClick={loadConfig} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <ErrorBanner error={error} />

        <label className="field config-filter">
          <span>Filter</span>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search keys or values"
          />
        </label>

        <div className="config-table-scroll">
          <table className="data-table config-table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Type</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(([key, value]) => (
                <tr key={key}>
                  <td title={key}>{key}</td>
                  <td>{getValueKind(value)}</td>
                  <td>
                    <pre className={value === "[redacted]" ? "config-value redacted" : "config-value"}>
                      {formatValue(value)}
                    </pre>
                  </td>
                </tr>
              ))}
              {!loading && entries.length === 0 && (
                <tr>
                  <td colSpan={3}>No configuration values match this filter.</td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={3}>Loading configuration...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <h3>Raw Snapshot</h3>
        <pre className="config-json">
          {snapshot ? JSON.stringify(snapshot, null, 2) : "No configuration loaded."}
        </pre>
      </div>
    </div>
  );
}
