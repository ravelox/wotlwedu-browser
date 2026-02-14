import { useEffect, useMemo, useState } from "react";
import { ErrorBanner, SuccessBanner } from "../components/Feedback";
import Loading from "../components/Loading";
import { toApiError } from "../lib/api";

function coerceValue(type, value) {
  if (type === "checkbox") return Boolean(value);
  if (type === "number") return value === "" || value == null ? "" : Number(value);
  return value ?? "";
}

export default function ResourcePage({ api, definition, scope }) {
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState({});
  const [uploadFile, setUploadFile] = useState(null);
  const [scopedOrganizationId, setScopedOrganizationId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filter, setFilter] = useState("");

  const fields = definition.fields;
  const idField = definition.idField;

  const newRecord = useMemo(() => {
    const next = {};
    for (const [key, , type] of fields) {
      next[key] = type === "checkbox" ? false : "";
    }
    // Default workgroupId for workgroup-scoped resources when the caller has a selected scope.
    if (definition.supportsWorkgroupScope && scope?.activeWorkgroupId) {
      if (Object.prototype.hasOwnProperty.call(next, "workgroupId")) {
        next.workgroupId = scope.activeWorkgroupId;
      }
    }
    return next;
  }, [fields, definition.supportsWorkgroupScope, scope?.activeWorkgroupId]);

  const listRows = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get(definition.path, {
        params: {
          page: 1,
          items: 100,
          filter: filter || undefined,
          workgroupId:
            definition.supportsWorkgroupScope && scope?.activeWorkgroupId
              ? scope.activeWorkgroupId
              : undefined,
        },
      });
      if (response.status >= 400) throw toApiError(response, `Failed to load ${definition.title}`);
      const items = response.data?.data?.[definition.listKey] || response.data?.[definition.listKey] || [];
      setRows(items);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSingle = async (id) => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const response = await api.get(`${definition.path}/${id}`);
      if (response.status >= 400) throw toApiError(response, `Failed to load ${definition.title} item`);
      const entity = response.data?.data?.[definition.singleKey] || response.data?.[definition.singleKey];
      if (!entity) return;
      const next = { ...newRecord };
      for (const [key, , type] of fields) {
        next[key] = coerceValue(type, entity[key]);
      }
      setForm(next);
      setSelectedId(id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = {};
      for (const [key, , type] of fields) {
        payload[key] = coerceValue(type, form[key]);
      }

      // If the UI has an active workgroup scope and this resource is workgroup-scoped,
      // default payload.workgroupId on create when the user hasn't specified it.
      if (
        !selectedId &&
        definition.supportsWorkgroupScope &&
        scope?.activeWorkgroupId &&
        (!payload.workgroupId || payload.workgroupId === "")
      ) {
        payload.workgroupId = scope.activeWorkgroupId;
      }

      const response = selectedId
        ? await api.put(`${definition.path}/${selectedId}`, payload)
        : await api.post(definition.path, payload);

      if (response.status >= 400) throw toApiError(response, `Failed to save ${definition.title}`);
      setSuccess(`${definition.title} saved`);
      if (!selectedId) setForm(newRecord);
      await listRows();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!selectedId) return;
    if (definition.deletable === false) return;
    if (!window.confirm(`Delete ${definition.title} item ${selectedId}?`)) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await api.delete(`${definition.path}/${selectedId}`);
      if (response.status >= 400) throw toApiError(response, `Failed to delete ${definition.title}`);
      setSuccess(`${definition.title} deleted`);
      setSelectedId(null);
      setForm(newRecord);
      await listRows();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const onUploadImage = async () => {
    if (definition.path !== "/image") return;
    if (!selectedId) {
      setError("Save the image record first, then upload a file.");
      return;
    }
    if (!uploadFile) {
      setError("Choose an image file to upload.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const formData = new FormData();
      const name = uploadFile.name || "";
      const ext = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
      const safeExt = ["png", "jpg", "jpeg"].includes(ext) ? ext : "jpg";
      formData.append("fileextension", safeExt);
      formData.append("imageUpload", uploadFile);

      const response = await api.post(`/image/file/${selectedId}`, formData);
      if (response.status >= 400) throw toApiError(response, "Failed to upload image");
      setSuccess("Image uploaded");
      setUploadFile(null);
      await listRows();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    setForm(newRecord);
    setUploadFile(null);
  }, [newRecord]);

  // For the Users pane: if a workgroup scope is selected, default the new-user organizationId
  // to the selected workgroup's organizationId (without overwriting user input).
  useEffect(() => {
    let cancelled = false;
    async function loadScopedOrgId() {
      setScopedOrganizationId(null);
      if (!api) return;
      if (definition.path !== "/user") return;
      if (!scope?.activeWorkgroupId) return;
      const response = await api.get(`/workgroup/${scope.activeWorkgroupId}`);
      const workgroup = response.data?.data?.workgroup || response.data?.workgroup;
      const orgId = workgroup?.organizationId || null;
      if (!cancelled) setScopedOrganizationId(orgId);
    }
    loadScopedOrgId().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [api, definition.path, scope?.activeWorkgroupId]);

  useEffect(() => {
    if (definition.path !== "/user") return;
    if (!scope?.activeWorkgroupId) return;
    if (selectedId) return; // editing an existing user
    if (!scopedOrganizationId) return;
    setForm((prev) => {
      if (!Object.prototype.hasOwnProperty.call(prev, "organizationId")) return prev;
      if (prev.organizationId && String(prev.organizationId).trim() !== "") return prev;
      return { ...prev, organizationId: scopedOrganizationId };
    });
  }, [definition.path, scope?.activeWorkgroupId, selectedId, scopedOrganizationId]);

  useEffect(() => {
    listRows();
  }, [scope?.activeWorkgroupId]);

  return (
    <div className="resource-grid">
      <div className="panel panel-table">
        <div className="panel-header">
          <h2>{definition.title}</h2>
          <div className="filter-row">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter"
            />
            <button className="btn" onClick={listRows}>Search</button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setSelectedId(null);
                setForm(newRecord);
                setUploadFile(null);
                setSuccess("");
                setError("");
              }}
            >
              New
            </button>
          </div>
        </div>

        {loading ? <Loading /> : (
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                {fields.slice(0, 3).map(([key, label]) => <th key={key}>{label}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row[idField]}
                  className={selectedId === row[idField] ? "row-selected" : ""}
                  onClick={() => loadSingle(row[idField])}
                >
                  <td>{row[idField]}</td>
                  {fields.slice(0, 3).map(([key]) => <td key={key}>{String(row[key] ?? "")}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel panel-form">
        <div className="panel-header">
          <h3>{selectedId ? `Edit ${selectedId}` : `New ${definition.title.slice(0, -1)}`}</h3>
        </div>
        <ErrorBanner error={error} />
        <SuccessBanner message={success} />

        <div className="form-grid">
          {fields.map(([key, label, type]) => (
            <label key={key} className={type === "textarea" ? "field field-full" : "field"}>
              <span>{label}</span>
              {type === "textarea" ? (
                <textarea value={form[key] ?? ""} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} />
              ) : type === "checkbox" ? (
                <input
                  type="checkbox"
                  checked={Boolean(form[key])}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.checked }))}
                />
              ) : (
                <input
                  type={type === "number" ? "number" : "text"}
                  value={form[key] ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value }))}
                />
              )}
            </label>
          ))}

          {definition.path === "/image" && (
            <div className="field field-full">
              <span style={{ display: "block", marginBottom: 6 }}>Upload File</span>
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) =>
                  setUploadFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)
                }
                disabled={saving || loading}
              />
              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  className="btn"
                  type="button"
                  onClick={onUploadImage}
                  disabled={saving || loading || !selectedId || !uploadFile}
                >
                  Upload
                </button>
                {!selectedId && (
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                    Create/save the image record first to get an ID.
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="actions">
          <button className="btn" disabled={saving} onClick={onSave}>{saving ? "Saving..." : "Save"}</button>
          {definition.deletable !== false && (
            <button className="btn btn-danger" disabled={!selectedId || saving} onClick={onDelete}>Delete</button>
          )}
        </div>
      </div>
    </div>
  );
}
