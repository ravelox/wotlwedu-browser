import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RESOURCE_DEFS } from "../lib/resourceDefs";

const RESOURCE_SEARCHES = [
  { key: "organizations", route: "/organizations", type: "Organization" },
  { key: "workgroups", route: "/spaces", type: "Space" },
  { key: "users", route: "/people", type: "Person" },
  { key: "categories", route: "/categories", type: "Category" },
  { key: "items", route: "/items", type: "Item" },
  { key: "lists", route: "/lists", type: "List" },
  { key: "elections", route: "/polls", type: "Poll" },
];

function labelFor(item) {
  return (
    item?.name ||
    item?.fullName ||
    [item?.firstName, item?.lastName].filter(Boolean).join(" ") ||
    item?.alias ||
    item?.email ||
    item?.id ||
    "Untitled"
  );
}

function buildStaticResults(session) {
  const admin = session?.systemAdmin || session?.organizationAdmin;
  return [
    { type: "Page", title: "Dashboard", route: "/dashboard", detail: "Admin action center" },
    { type: "Page", title: "Profile", route: "/profile", detail: "Account, sessions, invites" },
    { type: "Page", title: "Organizations", route: "/organizations", detail: "Tenant records" },
    { type: "Page", title: "Spaces", route: "/spaces", detail: "Workgroup records" },
    { type: "Page", title: "People", route: "/people", detail: "User records" },
    { type: "Page", title: "Polls", route: "/polls", detail: "Poll records" },
    { type: "Action", title: "Inspect user", route: "/support", detail: "Open support investigation", visible: admin },
    { type: "Action", title: "Revoke sessions", route: "/support", detail: "Support session tools", visible: admin },
    { type: "Action", title: "Export audit", route: "/support", detail: "Auth and public poll CSV exports", visible: admin },
    { type: "Action", title: "Backup space", route: "/backup", detail: "Scoped backup and restore", visible: admin },
    { type: "Action", title: "Change password", route: "/support", detail: "Send password reset", visible: admin },
    { type: "Page", title: "Configuration", route: "/configuration", detail: "Runtime config", visible: session?.systemAdmin },
    { type: "Page", title: "Token Lab", route: "/token-lab", detail: "Generate support tokens", visible: session?.systemAdmin },
  ].filter((item) => item.visible !== false);
}

export default function CommandPalette({
  api,
  session,
  activeOrganizationId,
  activeWorkgroupId,
  open,
  onClose,
}) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [resourceResults, setResourceResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const staticResults = useMemo(() => buildStaticResults(session), [session]);
  const visibleStaticResults = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return staticResults;
    return staticResults.filter((item) =>
      `${item.title} ${item.type} ${item.detail}`.toLowerCase().includes(needle)
    );
  }, [query, staticResults]);
  const results = [...visibleStaticResults, ...resourceResults];

  useEffect(() => {
    if (!open) return undefined;
    setActiveIndex(0);
    const handle = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(handle);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const needle = query.trim();
    if (needle.length < 2 || !api) {
      setResourceResults([]);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    async function searchResources() {
      setLoading(true);
      const params = {
        page: 1,
        items: 5,
        filter: needle,
        organizationId: activeOrganizationId || session?.organizationId || undefined,
        workgroupId: activeWorkgroupId || undefined,
      };
      const settled = await Promise.allSettled(
        RESOURCE_SEARCHES.map(async (config) => {
          if (config.key === "organizations" && !session?.systemAdmin) return [];
          const def = RESOURCE_DEFS[config.key];
          const response = await api.get(def.path, { params });
          const rows = response.data?.data?.[def.listKey] || response.data?.[def.listKey] || [];
          return rows.slice(0, 5).map((row) => ({
            type: config.type,
            title: labelFor(row),
            detail: row.email || row.description || row.id,
            scope: row.organizationId || row.workgroupId || activeOrganizationId || session?.organizationId || "Global",
            route: `${config.route}?id=${encodeURIComponent(row.id)}`,
          }));
        })
      );
      if (cancelled) return;
      setResourceResults(
        settled.flatMap((item) => (item.status === "fulfilled" ? item.value : []))
      );
      setLoading(false);
    }
    searchResources();
    return () => {
      cancelled = true;
    };
  }, [activeOrganizationId, activeWorkgroupId, api, open, query, session]);

  if (!open) return null;

  function choose(result) {
    if (!result) return;
    navigate(result.route);
    onClose();
  }

  function onKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(results.length - 1, current + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(0, current - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(results[activeIndex]);
    }
  }

  return (
    <div className="command-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command search"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Search people, organizations, spaces, polls, settings, or actions"
        />
        <div className="command-results" role="listbox">
          {results.map((result, index) => (
            <button
              className={`command-result${index === activeIndex ? " command-result-active" : ""}`}
              key={`${result.type}-${result.route}-${result.title}`}
              type="button"
              onClick={() => choose(result)}
              role="option"
              aria-selected={index === activeIndex}
            >
              <span className="status-chip">{result.type}</span>
              <span>
                <strong>{result.title}</strong>
                <small>{result.scope ? `${result.scope} | ${result.detail}` : result.detail}</small>
              </span>
            </button>
          ))}
          {!results.length ? (
            <div className="empty-state">
              <strong>{loading ? "Searching..." : "No command results found."}</strong>
              <span>Try a person name, email, organization, space, poll, or support action.</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
