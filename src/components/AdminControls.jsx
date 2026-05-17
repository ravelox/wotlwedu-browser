import { useEffect, useState } from "react";
import { toApiError } from "../lib/api";

export function PaginationControls({
  page,
  itemsPerPage,
  total,
  onPageChange,
  onItemsPerPageChange,
}) {
  const totalPages = Math.max(1, Math.ceil((Number(total) || 0) / itemsPerPage));
  return (
    <div className="pagination-row">
      <span>
        Page {page} of {totalPages} ({Number(total) || 0} total)
      </span>
      {onItemsPerPageChange ? (
        <select
          value={itemsPerPage}
          onChange={(event) => onItemsPerPageChange(Number(event.target.value))}
        >
          {[25, 50, 100].map((value) => (
            <option key={value} value={value}>
              {value} rows
            </option>
          ))}
        </select>
      ) : null}
      <button
        className="btn btn-secondary"
        type="button"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        title="Go to previous page"
        aria-label="Go to previous page"
      >
        Previous
      </button>
      <button
        className="btn btn-secondary"
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        title="Go to next page"
        aria-label="Go to next page"
      >
        Next
      </button>
    </div>
  );
}

export function ConfirmActionModal({
  action,
  onCancel,
  onConfirm,
  busy = false,
}) {
  const [reason, setReason] = useState("");
  if (!action) return null;

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="confirm-modal" role="dialog" aria-modal="true">
        <h3>{action.title || "Confirm Action"}</h3>
        <dl className="confirm-details">
          <div>
            <dt>Tenant</dt>
            <dd>{action.tenant || "Global / cross-tenant"}</dd>
          </div>
          <div>
            <dt>Target</dt>
            <dd>{action.target || "Selected record"}</dd>
          </div>
          <div>
            <dt>Impact</dt>
            <dd>{action.impact || "This changes production data."}</dd>
          </div>
        </dl>
        <label className="field field-full">
          <span>Reason</span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Required for audit context"
            rows={3}
          />
        </label>
        <div className="actions">
          <button
            className="btn btn-secondary"
            type="button"
            onClick={onCancel}
            disabled={busy}
            title="Cancel this action"
          >
            Cancel
          </button>
          <button
            className="btn btn-danger"
            type="button"
            onClick={() => onConfirm(reason.trim())}
            disabled={busy || reason.trim().length < 6}
            title="Confirm this production change"
          >
            {busy ? "Applying..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SearchPicker({
  api,
  path,
  listKey,
  value,
  onChange,
  params = {},
  placeholder = "Search",
  getLabel = defaultLabel,
  getSummary = defaultSummary,
  disabled = false,
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!value) {
      setSelected(null);
      setQuery("");
    } else if (!selected || selected.id !== value) {
      setQuery(value);
    }
  }, [selected, value]);

  async function runSearch(event) {
    if (event) event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await api.get(path, {
        params: {
          ...params,
          page: 1,
          items: 25,
          filter: query.trim() || undefined,
        },
      });
      if (response.status >= 400) throw toApiError(response, "Search failed");
      const items = response.data?.data?.[listKey] || response.data?.[listKey] || [];
      setResults(Array.isArray(items) ? items : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function choose(item) {
    setSelected(item);
    setQuery(getLabel(item));
    onChange(item?.id || "");
    setResults([]);
  }

  return (
    <div className="search-picker">
      <form className="search-picker-row" onSubmit={runSearch}>
        <input
          value={query}
          disabled={disabled}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
        />
        <button
          className="btn btn-secondary"
          type="submit"
          disabled={disabled || loading}
          title={loading ? "Search in progress" : "Search matching records"}
        >
          {loading ? "Searching..." : "Search"}
        </button>
        {value ? (
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => {
              setSelected(null);
              setQuery("");
              onChange("");
            }}
            disabled={disabled}
            title="Clear selected record"
          >
            Clear
          </button>
        ) : null}
      </form>
      {error ? <small className="field-error">{error}</small> : null}
      {value ? <small className="selected-summary">{getSummary(selected, value)}</small> : null}
      {results.length ? (
        <div className="picker-results">
          {results.map((item) => (
            <button
              className="picker-result"
              key={item.id}
              type="button"
              onClick={() => choose(item)}
            >
              <strong>{getLabel(item)}</strong>
              <span>{item.id}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function defaultLabel(item) {
  if (!item) return "";
  return item.name || item.fullName || item.alias || item.email || item.id || "";
}

function defaultSummary(item, value) {
  if (!value) return "";
  if (!item) return `Selected ID: ${value}`;
  return `Selected: ${defaultLabel(item)} (${value})`;
}
