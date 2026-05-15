import { useMemo, useState } from "react";
import { SearchPicker } from "../components/AdminControls";
import { ErrorBanner, SuccessBanner } from "../components/Feedback";
import { toApiError } from "../lib/api";

function scopeLabel(scope) {
  if (scope === "system") return "Whole System";
  if (scope === "organization") return "Organization";
  if (scope === "space") return "Space";
  return "Backup";
}

function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function countRows(counts = {}) {
  return Object.values(counts).reduce((total, count) => total + Number(count || 0), 0);
}

export default function BackupPage({ api, session, scope }) {
  const canUseSystemScope = session?.systemAdmin === true;
  const [backupScope, setBackupScope] = useState(canUseSystemScope ? "system" : "organization");
  const [organizationId, setOrganizationId] = useState(
    scope?.activeOrganizationId || session?.organizationId || ""
  );
  const [workgroupId, setWorkgroupId] = useState(scope?.activeWorkgroupId || "");
  const [lastBackup, setLastBackup] = useState(null);
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreMode, setRestoreMode] = useState("upsert");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedOrganizationId =
    backupScope === "system" ? "" : organizationId || session?.organizationId || "";
  const selectedWorkgroupId = backupScope === "space" ? workgroupId : "";
  const exportDisabled =
    busy ||
    (backupScope === "organization" && !selectedOrganizationId) ||
    (backupScope === "space" && !selectedWorkgroupId);
  const spaceSearchParams = useMemo(
    () => ({
      organizationId: selectedOrganizationId || undefined,
    }),
    [selectedOrganizationId]
  );

  async function exportBackup() {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const response = await api.get("/support/backup", {
        params: {
          scope: backupScope,
          organizationId: backupScope === "organization" ? selectedOrganizationId : undefined,
          workgroupId: backupScope === "space" ? selectedWorkgroupId : undefined,
        },
      });
      if (response.status >= 400) throw toApiError(response, "Failed to export backup");
      const backup = response.data?.data?.backup;
      setLastBackup(backup);
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const target =
        backupScope === "space"
          ? selectedWorkgroupId
          : backupScope === "organization"
            ? selectedOrganizationId
            : "system";
      downloadJson(`wotlwedu-${backupScope}-${target}-${stamp}.json`, backup);
      setSuccess(`${scopeLabel(backupScope)} backup exported.`);
    } catch (err) {
      setError(err.message || "Failed to export backup");
    } finally {
      setBusy(false);
    }
  }

  async function restoreBackup(event) {
    event.preventDefault();
    if (!restoreFile) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const text = await restoreFile.text();
      const backup = JSON.parse(text);
      const response = await api.post("/support/backup/restore", {
        backup,
        mode: restoreMode,
      });
      if (response.status >= 400) throw toApiError(response, "Failed to restore backup");
      setSuccess(`${scopeLabel(backup.scope)} backup restored.`);
      setLastBackup({
        ...backup,
        counts: Object.fromEntries(
          Object.entries(response.data?.data?.restore?.summary || {}).map(([key, value]) => [
            key,
            Number(value.created || 0) + Number(value.updated || 0),
          ])
        ),
      });
    } catch (err) {
      setError(err.message || "Failed to restore backup");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="profile-stack">
      <section className="panel">
        <h2>Backup and Restore</h2>
        <ErrorBanner error={error} />
        <SuccessBanner message={success} />

        <div className="backup-grid">
          <div>
            <h3>Export</h3>
            <label className="field">
              <span>Scope</span>
              <select
                value={backupScope}
                onChange={(event) => {
                  setBackupScope(event.target.value);
                  setLastBackup(null);
                }}
                disabled={busy}
              >
                {canUseSystemScope ? <option value="system">Whole system</option> : null}
                <option value="organization">Organization</option>
                <option value="space">Space</option>
              </select>
            </label>

            {backupScope !== "system" && canUseSystemScope ? (
              <label className="field">
                <span>Organization</span>
                <SearchPicker
                  api={api}
                  path="/organization"
                  listKey="organizations"
                  value={selectedOrganizationId}
                  onChange={setOrganizationId}
                  placeholder="Search organizations"
                  disabled={busy}
                />
              </label>
            ) : null}

            {backupScope !== "system" && !canUseSystemScope ? (
              <div className="scope-note">Organization: {selectedOrganizationId || "current"}</div>
            ) : null}

            {backupScope === "space" ? (
              <label className="field">
                <span>Space</span>
                <SearchPicker
                  api={api}
                  path="/space"
                  listKey="workgroups"
                  value={selectedWorkgroupId}
                  onChange={setWorkgroupId}
                  params={spaceSearchParams}
                  placeholder="Search spaces"
                  disabled={busy || (!selectedOrganizationId && !canUseSystemScope)}
                />
              </label>
            ) : null}

            <div className="actions">
              <button className="btn" type="button" onClick={exportBackup} disabled={exportDisabled}>
                {busy ? "Working..." : "Export JSON"}
              </button>
            </div>
          </div>

          <form onSubmit={restoreBackup}>
            <h3>Restore</h3>
            <label className="field">
              <span>Backup JSON</span>
              <input
                type="file"
                accept="application/json,.json"
                onChange={(event) => setRestoreFile(event.target.files?.[0] || null)}
                disabled={busy}
              />
            </label>
            <label className="field">
              <span>Mode</span>
              <select
                value={restoreMode}
                onChange={(event) => setRestoreMode(event.target.value)}
                disabled={busy}
              >
                <option value="upsert">Create and update matching IDs</option>
                <option value="insertOnly">Create missing rows only</option>
              </select>
            </label>
            <div className="actions">
              <button className="btn btn-danger" type="submit" disabled={busy || !restoreFile}>
                {busy ? "Working..." : "Restore JSON"}
              </button>
            </div>
          </form>
        </div>
      </section>

      {lastBackup ? (
        <section className="panel">
          <h2>Last Backup Summary</h2>
          <div className="metric-grid">
            <div className="metric-card">
              <span>Scope</span>
              <div className="metric">{scopeLabel(lastBackup.scope)}</div>
            </div>
            <div className="metric-card">
              <span>Rows</span>
              <div className="metric">{countRows(lastBackup.counts)}</div>
            </div>
            <div className="metric-card">
              <span>Organization</span>
              <div className="metric metric-small">{lastBackup.organizationId || "Global"}</div>
            </div>
            <div className="metric-card">
              <span>Space</span>
              <div className="metric metric-small">{lastBackup.workgroupId || "All"}</div>
            </div>
          </div>
          <div className="data-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Table</th>
                  <th>Rows</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(lastBackup.counts || {}).map(([key, value]) => (
                  <tr key={key}>
                    <td>{key}</td>
                    <td>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
