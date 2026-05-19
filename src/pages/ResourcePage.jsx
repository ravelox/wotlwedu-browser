import { useEffect, useMemo, useState } from "react";
import { ErrorBanner, SuccessBanner } from "../components/Feedback";
import Loading from "../components/Loading";
import { toApiError } from "../lib/api";
import { getImageUploadExtension, validateImageUploadFile } from "../lib/uploadValidation";
import {
  ConfirmActionModal,
  PaginationControls,
  SearchPicker,
} from "../components/AdminControls";
import DisabledReason from "../components/DisabledReason";
import ScopeBadge from "../components/ScopeBadge";

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

export default function ResourcePage({ api, definition, session, scope, onGlobalModeUsed }) {
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState({});
  const [uploadFile, setUploadFile] = useState(null);
  const [allCapabilities, setAllCapabilities] = useState([]);
  const [capabilityFilter, setCapabilityFilter] = useState("");
  const [selectedCapabilityIds, setSelectedCapabilityIds] = useState([]);
  const [initialCapabilityIds, setInitialCapabilityIds] = useState([]);
  const [selectedRoleProtected, setSelectedRoleProtected] = useState(false);
  const [showAllRoleCapabilities, setShowAllRoleCapabilities] = useState(false);
  const [scopedOrganizationId, setScopedOrganizationId] = useState(null);
  const [categoryOwnerId, setCategoryOwnerId] = useState(session?.userId || "");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [total, setTotal] = useState(0);
  const [sortKey, setSortKey] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");
  const [confirmAction, setConfirmAction] = useState(null);

  const fields = definition.fields;
  const idField = definition.idField;
  const isRoleResource = definition.path === "/role";
  const isCategoryResource = definition.path === "/category";
  const hasCategoryField = fields.some(([key]) => key === "categoryId");
  const canChooseCategoryOwner = session?.systemAdmin === true;
  const hasLoadedRows = total > 0 || rows.length > 0;
  const uploadDisabledReason =
    saving || loading
      ? "record operation is already running"
      : !selectedId
        ? "save the picture record first"
        : !uploadFile
          ? "choose a PNG or JPEG file"
          : "";
  const deleteDisabledReason =
    saving
      ? "record operation is already running"
      : !selectedId
        ? "select a record first"
        : isRoleResource && selectedRoleProtected
          ? "protected roles cannot be deleted"
          : "";
  const tenantLabel =
    scope?.activeOrganizationId ||
    scopedOrganizationId ||
    session?.organizationId ||
    "Global / cross-tenant";

  const isProtectedRole = (role) =>
    role?.protected === true || role?.protected === 1 || role?.protected === "1";

  const visibleCapabilities = useMemo(() => {
    if (!isRoleResource) return [];
    if (showAllRoleCapabilities) return allCapabilities;
    const selectedSet = new Set(selectedCapabilityIds);
    return allCapabilities.filter((cap) => cap?.id && selectedSet.has(cap.id));
  }, [allCapabilities, isRoleResource, selectedCapabilityIds, showAllRoleCapabilities]);

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

  const listRows = async (nextPage = page) => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get(definition.path, {
        params: {
          page: nextPage,
          items: itemsPerPage,
          filter: filter || undefined,
          organizationId:
            definition.path === "/space" && scope?.activeOrganizationId
              ? scope.activeOrganizationId
              : undefined,
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
      setRows(Array.isArray(items) ? items : []);
      setTotal(Number(response.data?.data?.total ?? response.data?.total ?? items.length ?? 0));
      setPage(Number(response.data?.data?.page ?? nextPage));
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
        params: { page: 1, items: 50, filter: capabilityFilter || undefined },
      });
      if (response.status >= 400) throw toApiError(response, "Failed to load capabilities");
      const items =
        response.data?.data?.capabilities || response.data?.capabilities || [];
      setAllCapabilities(Array.isArray(items) ? items : []);
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
        setSelectedRoleProtected(isProtectedRole(entity));
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
        setCategoryOwnerId(ownerId);
      }

      setForm(next);
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
    setUploadFile(null);
    if (isRoleResource) {
      setSelectedCapabilityIds([]);
      setInitialCapabilityIds([]);
      setSelectedRoleProtected(false);
      setShowAllRoleCapabilities(false);
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
        setCategoryOwnerId(resetOwnerId);
        setSelectedCapabilityIds([]);
        setInitialCapabilityIds([]);
        setSelectedRoleProtected(false);
        setShowAllRoleCapabilities(false);
      }
      await listRows(selectedId ? page : 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const executeDelete = async (reason) => {
    if (!selectedId) return;
    if (definition.deletable === false) return;
    if (isRoleResource && selectedRoleProtected) {
      setError("Protected roles cannot be deleted.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await api.delete(`${definition.path}/${selectedId}`, {
        data: { reason },
      });
      if (response.status >= 400) throw toApiError(response, `Failed to delete ${definition.title}`);
      setSuccess(`${definition.title} deleted`);
      if (!scope?.activeOrganizationId && scope?.globalModeConfirmed) {
        onGlobalModeUsed?.();
      }
      setSelectedId(null);
      const resetOwnerId = session?.userId || "";
      setCategoryOwnerId(resetOwnerId);
      setForm({
        ...newRecord,
        ...(isCategoryResource ? { creator: resetOwnerId } : {}),
      });
      setSelectedCapabilityIds([]);
      setInitialCapabilityIds([]);
      setSelectedRoleProtected(false);
      setShowAllRoleCapabilities(false);
      await listRows();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
      setConfirmAction(null);
    }
  };

  const onUploadImage = async () => {
    if (definition.path !== "/picture") return;
    if (!selectedId) {
      setError("Save the picture record first, then upload a file.");
      return;
    }
    if (!uploadFile) {
      setError("Choose a picture file to upload.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const validationError = validateImageUploadFile(uploadFile);
      if (validationError) {
        throw new Error(validationError);
      }

      const formData = new FormData();
      formData.append("fileextension", getImageUploadExtension(uploadFile));
      formData.append("imageUpload", uploadFile);

      const response = await api.post(`/picture/file/${selectedId}`, formData);
      if (response.status >= 400) throw toApiError(response, "Failed to upload picture");
      setSuccess("Picture uploaded");
      setUploadFile(null);
      await listRows();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    setSortKey(definition.idField);
    const resetOwnerId = session?.userId || "";
    setForm({
      ...newRecord,
      ...(isCategoryResource ? { creator: resetOwnerId } : {}),
    });
    setCategoryOwnerId(resetOwnerId);
    setUploadFile(null);
    if (!isRoleResource) {
      setAllCapabilities([]);
      setSelectedCapabilityIds([]);
      setInitialCapabilityIds([]);
      setSelectedRoleProtected(false);
      setShowAllRoleCapabilities(false);
    }
  }, [newRecord, isCategoryResource, isRoleResource, session?.userId]);

  useEffect(() => {
    let cancelled = false;
    async function loadScopedOrgId() {
      setScopedOrganizationId(null);
      if (!api) return;
      if (definition.path !== "/person") return;
      if (!scope?.activeWorkgroupId) return;
      const response = await api.get(`/space/${scope.activeWorkgroupId}`);
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
    if (definition.path !== "/person") return;
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
    listRows(1);
  }, [scope?.activeWorkgroupId, scope?.activeOrganizationId, categoryOwnerId, itemsPerPage]);

  useEffect(() => {
    listCapabilities();
  }, [definition.path, capabilityFilter]);

  const sortedRows = useMemo(() => {
    const key = sortKey || idField;
    const next = [...rows];
    next.sort((a, b) => {
      const left = String(a?.[key] ?? "").toLowerCase();
      const right = String(b?.[key] ?? "").toLowerCase();
      if (left === right) return 0;
      return (left > right ? 1 : -1) * (sortDirection === "asc" ? 1 : -1);
    });
    return next;
  }, [rows, sortDirection, sortKey]);

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  function pickerConfig(type) {
    const orgId = scope?.activeOrganizationId || form.organizationId || session?.organizationId || "";
    const workgroupId = scope?.activeWorkgroupId || form.workgroupId || "";
    const configs = {
      "organization-combobox": {
        path: "/organization",
        listKey: "organizations",
        placeholder: "Search organizations",
      },
      "user-combobox": {
        path: "/person",
        listKey: "users",
        placeholder: "Search people",
        params: orgId ? { organizationId: orgId } : {},
      },
      "workgroup-combobox": {
        path: "/space",
        listKey: "workgroups",
        placeholder: "Search spaces",
        params: orgId ? { organizationId: orgId } : {},
      },
      "category-combobox": {
        path: "/category",
        listKey: "categories",
        placeholder: "Search categories",
        params:
          canChooseCategoryOwner && categoryOwnerId ? { creator: categoryOwnerId } : {},
      },
      "image-combobox": {
        path: "/picture",
        listKey: "images",
        placeholder: "Search pictures",
        params: workgroupId ? { workgroupId } : {},
      },
      "item-combobox": {
        path: "/item",
        listKey: "items",
        placeholder: "Search items",
        params: workgroupId ? { workgroupId } : {},
      },
      "list-combobox": {
        path: "/list",
        listKey: "lists",
        placeholder: "Search lists",
        params: workgroupId ? { workgroupId } : {},
      },
      "group-combobox": {
        path: "/circle",
        listKey: "groups",
        placeholder: "Search circles",
        params: workgroupId ? { workgroupId } : {},
      },
      "election-combobox": {
        path: "/poll",
        listKey: "elections",
        placeholder: "Search polls",
        params: workgroupId ? { workgroupId } : {},
      },
    };
    return configs[type] || null;
  }

  return (
    <div className="resource-grid">
      <div className="panel panel-table">
        <div className="panel-header">
          <h2>{definition.title}</h2>
          <div className="filter-row">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") listRows();
              }}
              placeholder="Filter"
            />
            {isCategoryResource && canChooseCategoryOwner && (
              <div className="filter-picker">
                <SearchPicker
                  api={api}
                  path="/person"
                  listKey="users"
                  value={categoryOwnerId}
                  onChange={(value) => setCategoryOwnerId(value)}
                  params={
                    scope?.activeOrganizationId || session?.organizationId
                      ? { organizationId: scope?.activeOrganizationId || session?.organizationId }
                      : {}
                  }
                  placeholder="Category owner"
                />
              </div>
            )}
            <button
              className="btn"
              type="button"
              onClick={() => listRows(1)}
              title={`Search ${definition.title.toLowerCase()}`}
            >
              Search
            </button>
            {selectedId && (
              <button
                className="btn btn-secondary"
                onClick={resetEditor}
                type="button"
                title="Clear the selected record and reset the editor"
              >
                Clear Selection
              </button>
            )}
          </div>
        </div>
        <div className="scope-banner">
          <strong>Scope</strong>
          <ScopeBadge
            activeOrganizationId={scope?.activeOrganizationId || session?.organizationId || ""}
            activeWorkgroupId={scope?.activeWorkgroupId}
            globalModeConfirmed={scope?.globalModeConfirmed}
          />
          <span>Organization: {scope?.activeOrganizationId || session?.organizationId || "not selected"}</span>
          <span>Space: {scope?.activeWorkgroupId || "not selected"}</span>
          {scope?.globalModeConfirmed ? <span className="danger-text">Global write confirmation resets after destructive actions</span> : null}
        </div>

        {loading ? <Loading /> : (
          <div className="data-table-scroll">
            {!hasLoadedRows ? (
              <div className="empty-state">
                <strong>No {definition.title.toLowerCase()} found.</strong>
                <span>
                  {filter
                    ? "Clear the filter or broaden the current scope, then search again."
                    : "Create a new record in the editor, or choose a different organization or space scope."}
                </span>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>
                      <button className="table-sort" type="button" onClick={() => toggleSort(idField)}>
                        ID{sortKey === idField ? ` ${sortDirection === "asc" ? "↑" : "↓"}` : ""}
                      </button>
                    </th>
                    {fields.slice(0, 3).map(([key, label]) => (
                      <th key={key}>
                        <button className="table-sort" type="button" onClick={() => toggleSort(key)}>
                          {label}{sortKey === key ? ` ${sortDirection === "asc" ? "↑" : "↓"}` : ""}
                        </button>
                      </th>
                    ))}
                    {isRoleResource && <th>Status</th>}
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((row) => (
                    <tr
                      key={row[idField]}
                      className={selectedId === row[idField] ? "row-selected" : ""}
                      onClick={() => loadSingle(row[idField])}
                    >
                      <td>{row[idField]}</td>
                      {fields.slice(0, 3).map(([key]) => <td key={key}>{String(row[key] ?? "")}</td>)}
                      {isRoleResource && (
                        <td>
                          {isProtectedRole(row) ? (
                            <span className="role-protected-badge">Protected</span>
                          ) : (
                            <span className="role-standard-badge">Editable</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <PaginationControls
              page={page}
              itemsPerPage={itemsPerPage}
              total={total}
              onPageChange={(nextPage) => listRows(nextPage)}
              onItemsPerPageChange={(nextItems) => {
                setItemsPerPage(nextItems);
                setPage(1);
              }}
            />
          </div>
        )}
      </div>

      <div className="panel panel-form">
        <div className="panel-header">
          <div>
            <h3>{selectedId ? `Edit ${selectedId}` : `New ${singularizeTitle(definition.title)}`}</h3>
            {isRoleResource && selectedId && selectedRoleProtected && (
              <p className="role-protected-note">
                <span className="role-protected-badge">Protected</span>
                This role is protected from deletion.
              </p>
            )}
          </div>
        </div>
        <ErrorBanner error={error} />
        <SuccessBanner message={success} />

        <div className="form-grid">
          {hasCategoryField && (
            <div className="field field-full">
              <span>
                Category choices for owner: <strong>{categoryOwnerId || session?.userId || "current person"}</strong>
              </span>
              {canChooseCategoryOwner ? (
                <SearchPicker
                  api={api}
                  path="/person"
                  listKey="users"
                  value={categoryOwnerId}
                  onChange={(value) => setCategoryOwnerId(value || session?.userId || "")}
                  params={
                    scope?.activeOrganizationId || session?.organizationId
                      ? { organizationId: scope?.activeOrganizationId || session?.organizationId }
                      : {}
                  }
                  placeholder="Search category owner"
                />
              ) : null}
            </div>
          )}

          {fields.map(([key, label, type]) => (
            <label key={key} className={type === "textarea" ? "field field-full" : "field"}>
              <span>{label}</span>
              {type === "textarea" ? (
                <textarea value={form[key] ?? ""} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} />
              ) : pickerConfig(type) ? (
                <SearchPicker
                  api={api}
                  value={form[key] ?? ""}
                  onChange={(value) => {
                    setForm((p) => ({ ...p, [key]: value }));
                    if (key === "creator" && isCategoryResource && canChooseCategoryOwner) {
                      setCategoryOwnerId(value);
                    }
                  }}
                  {...pickerConfig(type)}
                />
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

          {definition.path === "/picture" && (
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
                <div className="action-with-reason">
                  <button
                    className="btn"
                    type="button"
                    onClick={onUploadImage}
                    disabled={saving || loading || !selectedId || !uploadFile}
                    title={uploadDisabledReason || "Upload the selected image file"}
                  >
                    Upload
                  </button>
                  <DisabledReason reason={uploadDisabledReason} />
                </div>
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
              <div className="capability-picker-header">
                <span>Capabilities ({selectedCapabilityIds.length})</span>
                <div className="segmented-control" aria-label="Capability list display">
                  <button
                    type="button"
                    className={!showAllRoleCapabilities ? "segmented-active" : ""}
                    onClick={() => setShowAllRoleCapabilities(false)}
                  >
                    Selected
                  </button>
                  <button
                    type="button"
                    className={showAllRoleCapabilities ? "segmented-active" : ""}
                    onClick={() => setShowAllRoleCapabilities(true)}
                  >
                    All
                  </button>
                </div>
              </div>
              <form className="search-picker-row" onSubmit={(event) => {
                event.preventDefault();
                listCapabilities();
              }}>
                <input
                  value={capabilityFilter}
                  onChange={(event) => setCapabilityFilter(event.target.value)}
                  placeholder="Search capabilities"
                />
                <button className="btn btn-secondary" type="submit" title="Search capabilities">
                  Search
                </button>
              </form>
              <div className="capability-picker">
                {visibleCapabilities.map((cap) => {
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
                {visibleCapabilities.length === 0 && (
                  <div className="capability-empty">
                    {showAllRoleCapabilities
                      ? "No capabilities are available."
                      : "No capabilities selected for this role."}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="actions">
          <button className="btn" disabled={saving} onClick={onSave} title="Save this record">
            {saving ? "Saving..." : "Save"}
          </button>
          {definition.deletable !== false && (
            <div className="action-with-reason">
              <button
                className="btn btn-danger"
                disabled={!selectedId || saving || (isRoleResource && selectedRoleProtected)}
                onClick={() =>
                  setConfirmAction({
                    title: `Delete ${singularizeTitle(definition.title)}`,
                    tenant: tenantLabel,
                    target: selectedId,
                    impact: "The selected record will be deleted from production data.",
                  })
                }
                title={deleteDisabledReason || "Delete the selected record"}
              >
                Delete
              </button>
              <DisabledReason reason={deleteDisabledReason} />
            </div>
          )}
        </div>
      </div>
      <ConfirmActionModal
        action={confirmAction}
        busy={saving}
        onCancel={() => setConfirmAction(null)}
        onConfirm={executeDelete}
      />
    </div>
  );
}
