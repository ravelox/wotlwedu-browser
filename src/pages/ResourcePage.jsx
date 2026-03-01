import { useEffect, useMemo, useState } from "react";
import { ErrorBanner, SuccessBanner } from "../components/Feedback";
import Loading from "../components/Loading";
import { toApiError } from "../lib/api";

function coerceValue(type, value) {
  if (type === "checkbox") return Boolean(value);
  if (type === "number") return value === "" || value == null ? "" : Number(value);
  return value ?? "";
}

function singularizeTitle(title) {
  if (!title) return "";
  if (title.endsWith("ies")) return `${title.slice(0, -3)}y`;
  if (title.endsWith("s")) return title.slice(0, -1);
  return title;
}

export default function ResourcePage({ api, definition, session, scope }) {
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState({});
  const [comboQueries, setComboQueries] = useState({});
  const [allOrganizations, setAllOrganizations] = useState([]);
  const [uploadFile, setUploadFile] = useState(null);
  const [allCapabilities, setAllCapabilities] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedCapabilityIds, setSelectedCapabilityIds] = useState([]);
  const [initialCapabilityIds, setInitialCapabilityIds] = useState([]);
  const [scopedOrganizationId, setScopedOrganizationId] = useState(null);
  const [categoryOwnerId, setCategoryOwnerId] = useState(session?.userId || "");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filter, setFilter] = useState("");

  const fields = definition.fields;
  const idField = definition.idField;
  const isRoleResource = definition.path === "/role";
  const isCategoryResource = definition.path === "/category";
  const hasOrganizationCombobox = fields.some(([, , type]) => type === "organization-combobox");
  const hasUserCombobox = fields.some(([, , type]) => type === "user-combobox");
  const hasCategoryField = fields.some(([key]) => key === "categoryId");
  const canChooseCategoryOwner = session?.systemAdmin === true;

  const newRecord = useMemo(() => {
    const next = {};
    for (const [key, , type] of fields) {
      next[key] = type === "checkbox" ? false : "";
    }
    if (definition.supportsWorkgroupScope && scope?.activeWorkgroupId) {
      if (Object.prototype.hasOwnProperty.call(next, "workgroupId")) {
        next.workgroupId = scope.activeWorkgroupId;
      }
    }
    if (isCategoryResource && Object.prototype.hasOwnProperty.call(next, "creator")) {
      next.creator = session?.userId || "";
    }
    return next;
  }, [
    fields,
    definition.supportsWorkgroupScope,
    scope?.activeWorkgroupId,
    isCategoryResource,
    session?.userId,
  ]);

  const loadUsers = async () => {
    if (!canChooseCategoryOwner && !hasUserCombobox) {
      setAllUsers([]);
      return;
    }
    try {
      const response = await api.get("/user", {
        params: { page: 1, items: 1000 },
      });
      if (response.status >= 400) throw toApiError(response, "Failed to load users");
      const items = response.data?.data?.users || response.data?.users || [];
      setAllUsers(Array.isArray(items) ? items : []);
    } catch (err) {
      setError(err.message);
    }
  };

  const getOrganizationLabel = (organizationId) => {
    if (!organizationId) return "";
    const organization = allOrganizations.find((org) => org.id === organizationId);
    return organization?.name || organizationId;
  };

  const getUserLabel = (userId) => {
    if (!userId) return "";
    const user = allUsers.find((entry) => entry.id === userId);
    return user?.fullName || user?.alias || user?.email || user?.id || userId;
  };

  const listOrganizations = async () => {
    if (!hasOrganizationCombobox) {
      setAllOrganizations([]);
      return;
    }
    try {
      const response = await api.get("/organization", {
        params: { page: 1, items: 1000 },
      });
      if (response.status >= 400) throw toApiError(response, "Failed to load organizations");
      const items =
        response.data?.data?.organizations || response.data?.organizations || [];
      setAllOrganizations(Array.isArray(items) ? items : []);
    } catch (err) {
      setError(err.message);
    }
  };

  const listRows = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get(definition.path, {
        params: {
          page: 1,
          items: 100,
          filter: filter || undefined,
          creator:
            isCategoryResource && canChooseCategoryOwner && categoryOwnerId
              ? categoryOwnerId
              : undefined,
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

  const listCapabilities = async () => {
    if (!isRoleResource) return;
    try {
      const response = await api.get("/capability", {
        params: { page: 1, items: 1000 },
      });
      if (response.status >= 400) throw toApiError(response, "Failed to load capabilities");
      const items =
        response.data?.data?.capabilities || response.data?.capabilities || [];
      setAllCapabilities(Array.isArray(items) ? items : []);
    } catch (err) {
      setError(err.message);
    }
  };

  const listCategories = async (ownerId) => {
    if (!hasCategoryField && !isCategoryResource) {
      setAllCategories([]);
      return;
    }

    const effectiveOwnerId =
      ownerId || (isCategoryResource ? categoryOwnerId : selectedId ? categoryOwnerId : session?.userId);

    try {
      const response = await api.get("/category", {
        params: {
          page: 1,
          items: 1000,
          creator:
            canChooseCategoryOwner && effectiveOwnerId ? effectiveOwnerId : undefined,
        },
      });
      if (response.status >= 400) throw toApiError(response, "Failed to load categories");
      const items =
        response.data?.data?.categories || response.data?.categories || [];
      setAllCategories(Array.isArray(items) ? items : []);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadSingle = async (id) => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const response = await api.get(`${definition.path}/${id}`, {
        params: isRoleResource ? { detail: "capability" } : undefined,
      });
      if (response.status >= 400) throw toApiError(response, `Failed to load ${definition.title} item`);
      const entity = response.data?.data?.[definition.singleKey] || response.data?.[definition.singleKey];
      if (!entity) return;
      const next = { ...newRecord };
      for (const [key, , type] of fields) {
        next[key] = coerceValue(type, entity[key]);
      }
      if (isRoleResource) {
        const roleCaps = Array.isArray(entity.capabilities) ? entity.capabilities : [];
        const capIds = roleCaps
          .map((cap) => cap?.id)
          .filter((capId) => typeof capId === "string" && capId.length > 0);
        setSelectedCapabilityIds(capIds);
        setInitialCapabilityIds(capIds);
      }

      const ownerId =
        entity.creator ||
        next.creator ||
        session?.userId ||
        "";
      setCategoryOwnerId(ownerId);
      if (hasCategoryField) {
        await listCategories(ownerId);
      }

      setForm(next);
      setComboQueries({});
      setSelectedId(id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const syncRoleCapabilities = async (roleId) => {
    if (!isRoleResource || !roleId) return;

    const nextSet = new Set(selectedCapabilityIds);
    const currentSet = new Set(initialCapabilityIds);
    const toAdd = selectedCapabilityIds.filter((capId) => !currentSet.has(capId));
    const toDelete = initialCapabilityIds.filter((capId) => !nextSet.has(capId));

    if (toDelete.length > 0) {
      const response = await api.put(`/role/${roleId}/bulkcapdel`, {
        capabilityList: toDelete,
      });
      if (response.status >= 400) {
        throw toApiError(response, "Failed to remove role capabilities");
      }
    }

    if (toAdd.length > 0) {
      const response = await api.put(`/role/${roleId}/bulkcapadd`, {
        capabilityList: toAdd,
      });
      if (response.status >= 400) {
        throw toApiError(response, "Failed to add role capabilities");
      }
    }

    setInitialCapabilityIds([...selectedCapabilityIds]);
  };

  const resetEditor = async () => {
    const resetOwnerId = session?.userId || "";
    setSelectedId(null);
    setForm({
      ...newRecord,
      ...(isCategoryResource ? { creator: resetOwnerId } : {}),
    });
    setCategoryOwnerId(resetOwnerId);
    setComboQueries({});
    setUploadFile(null);
    if (hasCategoryField) {
      await listCategories(resetOwnerId);
    }
    if (isRoleResource) {
      setSelectedCapabilityIds([]);
      setInitialCapabilityIds([]);
    }
    setSuccess("");
    setError("");
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

      if (
        !selectedId &&
        definition.supportsWorkgroupScope &&
        scope?.activeWorkgroupId &&
        (!payload.workgroupId || payload.workgroupId === "")
      ) {
        payload.workgroupId = scope.activeWorkgroupId;
      }

      if (isCategoryResource && canChooseCategoryOwner) {
        payload.creator = categoryOwnerId || payload.creator || session?.userId || "";
      }

      const response = selectedId
        ? await api.put(`${definition.path}/${selectedId}`, payload)
        : await api.post(definition.path, payload);

      if (response.status >= 400) throw toApiError(response, `Failed to save ${definition.title}`);
      if (isRoleResource) {
        const savedRoleId =
          response.data?.data?.role?.id || response.data?.role?.id || selectedId;
        await syncRoleCapabilities(savedRoleId);
      }
      setSuccess(`${definition.title} saved`);
      if (!selectedId) {
        const resetOwnerId = session?.userId || "";
        setForm({
          ...newRecord,
          ...(isCategoryResource ? { creator: resetOwnerId } : {}),
        });
        setComboQueries({});
        setCategoryOwnerId(resetOwnerId);
        if (hasCategoryField) {
          await listCategories(resetOwnerId);
        }
        setSelectedCapabilityIds([]);
        setInitialCapabilityIds([]);
      }
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
      const resetOwnerId = session?.userId || "";
      setCategoryOwnerId(resetOwnerId);
      setForm({
        ...newRecord,
        ...(isCategoryResource ? { creator: resetOwnerId } : {}),
      });
      setComboQueries({});
      if (hasCategoryField) {
        await listCategories(resetOwnerId);
      }
      setSelectedCapabilityIds([]);
      setInitialCapabilityIds([]);
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
    const resetOwnerId = session?.userId || "";
    setForm({
      ...newRecord,
      ...(isCategoryResource ? { creator: resetOwnerId } : {}),
    });
    setComboQueries({});
    setCategoryOwnerId(resetOwnerId);
    setUploadFile(null);
    if (!isRoleResource) {
      setAllCapabilities([]);
      setSelectedCapabilityIds([]);
      setInitialCapabilityIds([]);
    }
  }, [newRecord, isCategoryResource, isRoleResource, session?.userId]);

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
    if (selectedId) return;
    if (!scopedOrganizationId) return;
    setForm((prev) => {
      if (!Object.prototype.hasOwnProperty.call(prev, "organizationId")) return prev;
      if (prev.organizationId && String(prev.organizationId).trim() !== "") return prev;
      return { ...prev, organizationId: scopedOrganizationId };
    });
  }, [definition.path, scope?.activeWorkgroupId, selectedId, scopedOrganizationId]);

  useEffect(() => {
    listRows();
  }, [scope?.activeWorkgroupId, categoryOwnerId]);

  useEffect(() => {
    listCapabilities();
  }, [definition.path]);

  useEffect(() => {
    listOrganizations();
  }, [definition.path]);

  useEffect(() => {
    loadUsers();
  }, [canChooseCategoryOwner, hasUserCombobox]);

  useEffect(() => {
    if (hasCategoryField && !selectedId) {
      listCategories(session?.userId || "");
    } else if (isCategoryResource) {
      listCategories(categoryOwnerId || session?.userId || "");
    }
  }, [definition.path, session?.userId]);

  useEffect(() => {
    const nextQueries = {};
    for (const [key, , type] of fields) {
      if (type === "organization-combobox") {
        nextQueries[key] = getOrganizationLabel(form[key] || "");
      }
      if (type === "user-combobox") {
        nextQueries[key] = getUserLabel(form[key] || "");
      }
    }
    setComboQueries((prev) => {
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(nextQueries);
      if (
        prevKeys.length === nextKeys.length &&
        nextKeys.every((key) => prev[key] === nextQueries[key])
      ) {
        return prev;
      }
      return nextQueries;
    });
  }, [fields, form, allOrganizations, allUsers]);

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
            {isCategoryResource && canChooseCategoryOwner && (
              <select
                value={categoryOwnerId || ""}
                onChange={(e) => setCategoryOwnerId(e.target.value)}
              >
                <option value="">(all category owners)</option>
                {allUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.fullName || user.alias || user.email || user.id}
                  </option>
                ))}
              </select>
            )}
            <button className="btn" onClick={listRows}>Search</button>
            {selectedId && (
              <button
                className="btn btn-secondary"
                onClick={resetEditor}
              >
                Clear Selection
              </button>
            )}
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
          <h3>{selectedId ? `Edit ${selectedId}` : `New ${singularizeTitle(definition.title)}`}</h3>
        </div>
        <ErrorBanner error={error} />
        <SuccessBanner message={success} />

        <div className="form-grid">
          {hasCategoryField && (
            <div className="field field-full">
              <span>
                Category choices for owner: <strong>{categoryOwnerId || session?.userId || "current user"}</strong>
              </span>
            </div>
          )}

          {fields.map(([key, label, type]) => (
            <label key={key} className={type === "textarea" ? "field field-full" : "field"}>
              <span>{label}</span>
              {type === "textarea" ? (
                <textarea value={form[key] ?? ""} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} />
              ) : key === "categoryId" ? (
                <select
                  value={form[key] ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                >
                  <option value="">None</option>
                  {allCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name || category.id}
                    </option>
                  ))}
                </select>
              ) : type === "organization-combobox" ? (
                <>
                  <input
                    type="text"
                    list={`${key}-options`}
                    value={comboQueries[key] ?? ""}
                    placeholder="Type organization name"
                    onChange={(e) => {
                      const query = e.target.value;
                      const trimmed = query.trim();
                      const byName = allOrganizations.find(
                        (org) => (org.name || "").toLowerCase() === trimmed.toLowerCase()
                      );
                      const byId = allOrganizations.find((org) => org.id === trimmed);
                      setComboQueries((prev) => ({ ...prev, [key]: query }));
                      setForm((p) => ({
                        ...p,
                        [key]: byName?.id || byId?.id || "",
                      }));
                    }}
                  />
                  <datalist id={`${key}-options`}>
                    {allOrganizations.map((organization) => (
                      <option key={organization.id} value={organization.name || organization.id} />
                    ))}
                  </datalist>
                  <small style={{ color: "var(--muted)" }}>
                    {form[key] ? `Selected ID: ${form[key]}` : "Select an organization by name."}
                  </small>
                </>
              ) : type === "user-combobox" ? (
                <>
                  <input
                    type="text"
                    list={`${key}-options`}
                    value={comboQueries[key] ?? ""}
                    placeholder="Type user name or email"
                    onChange={(e) => {
                      const query = e.target.value;
                      const trimmed = query.trim();
                      const byLabel = allUsers.find((user) => {
                        const label =
                          user.fullName || user.alias || user.email || user.id || "";
                        return label.toLowerCase() === trimmed.toLowerCase();
                      });
                      const byId = allUsers.find((user) => user.id === trimmed);
                      const nextUserId = byLabel?.id || byId?.id || "";
                      setComboQueries((prev) => ({ ...prev, [key]: query }));
                      setForm((p) => ({ ...p, [key]: nextUserId }));
                      if (key === "creator" && isCategoryResource && canChooseCategoryOwner) {
                        setCategoryOwnerId(nextUserId);
                      }
                    }}
                  />
                  <datalist id={`${key}-options`}>
                    {allUsers.map((user) => (
                      <option
                        key={user.id}
                        value={user.fullName || user.alias || user.email || user.id}
                      />
                    ))}
                  </datalist>
                  <small style={{ color: "var(--muted)" }}>
                    {form[key] ? `Selected ID: ${form[key]}` : "Select a user by name, alias, or email."}
                  </small>
                </>
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

          {isRoleResource && (
            <div className="field field-full">
              <span>Capabilities ({selectedCapabilityIds.length})</span>
              <div className="capability-picker">
                {allCapabilities.map((cap) => {
                  const capId = cap?.id;
                  if (!capId) return null;
                  const checked = selectedCapabilityIds.includes(capId);
                  return (
                    <label key={capId} className="capability-option">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          setSelectedCapabilityIds((prev) => {
                            const next = new Set(prev);
                            if (isChecked) next.add(capId);
                            else next.delete(capId);
                            return [...next];
                          });
                        }}
                      />
                      <span>{cap.name || capId}</span>
                    </label>
                  );
                })}
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
