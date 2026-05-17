export function getScopeState({ activeOrganizationId, activeWorkgroupId, globalModeConfirmed }) {
  if (activeWorkgroupId) {
    return {
      key: "space",
      label: "Space Scoped",
      detail: activeWorkgroupId,
    };
  }
  if (activeOrganizationId) {
    return {
      key: "organization",
      label: "Organization Scoped",
      detail: activeOrganizationId,
    };
  }
  if (globalModeConfirmed) {
    return {
      key: "global-write",
      label: "Global Write Enabled",
      detail: "All tenants",
    };
  }
  return {
    key: "global-read",
    label: "Global Read-Only",
    detail: "Choose a tenant to write",
  };
}

export default function ScopeBadge({
  activeOrganizationId,
  activeWorkgroupId,
  globalModeConfirmed,
  globalModeExpiresAt,
}) {
  const state = getScopeState({
    activeOrganizationId,
    activeWorkgroupId,
    globalModeConfirmed,
  });
  const expiresAt = globalModeConfirmed && globalModeExpiresAt
    ? new Date(globalModeExpiresAt).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  return (
    <span className={`scope-badge scope-badge-${state.key}`}>
      <strong>{state.label}</strong>
      <span>{expiresAt ? `${state.detail} until ${expiresAt}` : state.detail}</span>
    </span>
  );
}
