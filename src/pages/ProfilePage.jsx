import { useEffect, useState } from "react";
import { ErrorBanner, SuccessBanner } from "../components/Feedback";
import { toApiError } from "../lib/api";

function inviteStatusLabel(status) {
  if (status === "pending") return "Pending";
  if (status === "accepted") return "Accepted";
  if (status === "revoked") return "Revoked";
  if (status === "expired") return "Expired";
  return "Unknown";
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "Unknown";
}

function AuditTable({ audits, emptyMessage, formatAudit }) {
  if (!audits.length) {
    return <div className="loading">{emptyMessage}</div>;
  }

  return (
    <div className="data-table-scroll audit-table-scroll">
      <table className="data-table audit-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Event</th>
            <th>Outcome</th>
            <th>Message</th>
            <th>Context</th>
          </tr>
        </thead>
        <tbody>
          {audits.map((audit) => (
            <tr key={audit.id}>
              <td>{formatDate(audit.createdAt)}</td>
              <td>{audit.eventType || "Activity"}</td>
              <td>
                <span className={`status-chip status-${audit.outcome || "unknown"}`}>
                  {audit.outcome || "unknown"}
                </span>
              </td>
              <td>{formatAudit(audit)}</td>
              <td>
                {[audit.email, audit.provider, audit.organizationId].filter(Boolean).join(" / ") ||
                  "Account"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ProfilePage({ api, session, onLogout }) {
  const [organization, setOrganization] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFilter, setInviteFilter] = useState("all");
  const [organizationInvites, setOrganizationInvites] = useState([]);
  const [signInMethods, setSignInMethods] = useState({
    passwordEnabled: false,
    linkedProviders: [],
  });
  const [userAudits, setUserAudits] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [organizationAudits, setOrganizationAudits] = useState([]);
  const [auditOutcomeFilter, setAuditOutcomeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canManageOrganization =
    session?.organizationId &&
    (session?.organizationAdmin === true || session?.systemAdmin === true);

  async function loadInvites() {
    setLoading(true);
    try {
      const requests = [
        api.get(`/person/${session.userId}/signin-method`),
        api.get(`/person/${session.userId}/authaudit`, { params: { items: 10 } }),
        api.get("/login/session"),
      ];

      if (canManageOrganization) {
        requests.push(
          api.get(`/organization/${session.organizationId}`),
          api.get(`/support/organizations/${session.organizationId}/invite`, {
            params: inviteFilter === "all" ? undefined : { status: inviteFilter },
          }),
          api.get(`/support/organizations/${session.organizationId}/authaudit`, {
            params: {
              items: 20,
              ...(auditOutcomeFilter === "all" ? {} : { outcome: auditOutcomeFilter }),
            },
          })
        );
      }

      const [
        signInResponse,
        userAuditResponse,
        sessionResponse,
        organizationResponse,
        inviteResponse,
        organizationAuditResponse,
      ] = await Promise.all(requests);

      if (signInResponse.status >= 400) {
        throw toApiError(signInResponse, "Failed to load sign-in methods");
      }
      if (userAuditResponse.status >= 400) {
        throw toApiError(userAuditResponse, "Failed to load account activity");
      }
      if (sessionResponse.status >= 400) {
        throw toApiError(sessionResponse, "Failed to load sessions");
      }
      if (organizationResponse && organizationResponse.status >= 400) {
        throw toApiError(organizationResponse, "Failed to load organization");
      }
      if (inviteResponse && inviteResponse.status >= 400) {
        throw toApiError(inviteResponse, "Failed to load invitations");
      }
      if (organizationAuditResponse && organizationAuditResponse.status >= 400) {
        throw toApiError(organizationAuditResponse, "Failed to load organization audit feed");
      }

      setOrganization(
        organizationResponse?.data?.data?.organization ||
          organizationResponse?.data?.organization ||
          null
      );
      setOrganizationInvites(
        inviteResponse?.data?.data?.invites || inviteResponse?.data?.invites || []
      );
      setSignInMethods(
        signInResponse.data?.data?.methods || {
          passwordEnabled: false,
          linkedProviders: [],
        }
      );
      setUserAudits(userAuditResponse.data?.data?.audits || []);
      setSessions(sessionResponse.data?.data?.sessions || []);
      setOrganizationAudits(organizationAuditResponse?.data?.data?.audits || []);
    } catch (err) {
      setError(err.message || "Failed to load invitations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInvites().catch(() => {});
  }, [inviteFilter, auditOutcomeFilter, session?.organizationId, canManageOrganization]);

  async function submitInvite(event) {
    event.preventDefault();
    if (!session?.organizationId || !inviteEmail) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.post(`/support/organizations/${session.organizationId}/invite`, {
        email: inviteEmail,
      });
      if (response.status >= 400) {
        const conflict = response.data?.data?.conflict;
        if (conflict?.organizationName) {
          throw new Error(
            `${response.data?.message || "Invite conflict"}: ${conflict.organizationName}. ${conflict.resolution || ""}`.trim()
          );
        }
        throw toApiError(response, "Failed to send invite");
      }

      setInviteEmail("");
      setSuccess("Invitation sent.");
      await loadInvites();
    } catch (err) {
      setError(err.message || "Failed to send invite");
    } finally {
      setSaving(false);
    }
  }

  async function resendInvite(inviteId) {
    if (!inviteId || !session?.organizationId) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.post(
        `/support/organizations/${session.organizationId}/invite/${inviteId}/resend`
      );
      if (response.status >= 400) {
        throw toApiError(response, "Failed to resend invite");
      }

      setSuccess("Invitation resent with a new link.");
      await loadInvites();
    } catch (err) {
      setError(err.message || "Failed to resend invite");
    } finally {
      setSaving(false);
    }
  }

  async function revokeInvite(inviteId) {
    if (!inviteId || !session?.organizationId) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.delete(
        `/support/organizations/${session.organizationId}/invite/${inviteId}`
      );
      if (response.status >= 400) {
        throw toApiError(response, "Failed to revoke invite");
      }

      setSuccess("Invitation revoked.");
      await loadInvites();
    } catch (err) {
      setError(err.message || "Failed to revoke invite");
    } finally {
      setSaving(false);
    }
  }

  async function unlinkMethod(identityId) {
    if (!identityId || !session?.userId) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.delete(`/person/${session.userId}/signin-method/${identityId}`);
      if (response.status >= 400) {
        throw toApiError(response, "Failed to unlink sign-in method");
      }
      setSuccess("Sign-in method removed.");
      await loadInvites();
    } catch (err) {
      setError(err.message || "Failed to unlink sign-in method");
    } finally {
      setSaving(false);
    }
  }

  async function revokeSession(sessionId) {
    if (!sessionId) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await api.delete(`/login/session/${sessionId}`);
      if (response.status >= 400) {
        throw toApiError(response, "Failed to revoke session");
      }
      if (sessionId === session?.sessionId) {
        onLogout?.();
        return;
      }
      setSuccess("Session revoked.");
      await loadInvites();
    } catch (err) {
      setError(err.message || "Failed to revoke session");
    } finally {
      setSaving(false);
    }
  }

  async function revokeAllSessions() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await api.post("/login/logout/all");
      if (response.status >= 400) {
        throw toApiError(response, "Failed to revoke sessions");
      }
      onLogout?.();
    } catch (err) {
      setError(err.message || "Failed to revoke sessions");
      setSaving(false);
    }
  }

  function formatAudit(audit) {
    return audit?.message || `${audit?.eventType || "activity"} ${audit?.provider || ""}`.trim();
  }

  return (
    <div className="profile-stack">
      <section className="panel">
        <h2>Profile</h2>
        <div className="profile-grid">
          <div>
            <span className="profile-label">Person</span>
            <strong>{session?.alias || session?.email || "Person"}</strong>
          </div>
          <div>
            <span className="profile-label">Email</span>
            <strong>{session?.email || "Unknown"}</strong>
          </div>
          <div>
            <span className="profile-label">Organization</span>
            <strong>{organization?.name || session?.organizationId || "Not assigned"}</strong>
          </div>
          <div>
            <span className="profile-label">Role</span>
            <strong>
              {session?.systemAdmin
                ? "System Admin"
                : session?.organizationAdmin
                  ? "Organization Admin"
                  : session?.workgroupAdmin
                    ? "Space Admin"
                    : "Person"}
            </strong>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="invite-card-header">
          <div>
            <h2>Sessions</h2>
            <p className="muted-copy">Review and revoke active browser sessions.</p>
          </div>
          <button className="btn btn-secondary" disabled={saving} onClick={revokeAllSessions} type="button">
            Logout All Devices
          </button>
        </div>
        <div className="data-table-scroll">
          {sessions.length ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Session</th>
                  <th>Status</th>
                  <th>Device</th>
                  <th>Last Used</th>
                  <th>Expires</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((row) => (
                  <tr key={row.id}>
                    <td>{row.current ? "Current" : row.id}</td>
                    <td>
                      <span className="status-chip">{row.revokedAt ? "Revoked" : "Active"}</span>
                    </td>
                    <td title={row.userAgent || ""}>{row.userAgent || "Unknown device"}</td>
                    <td>{row.lastUsedAt ? new Date(row.lastUsedAt).toLocaleString() : "Unknown"}</td>
                    <td>{row.expiresAt ? new Date(row.expiresAt).toLocaleString() : "Unknown"}</td>
                    <td>
                      {!row.revokedAt ? (
                        <button
                          className="btn btn-danger"
                          disabled={saving}
                          onClick={() => revokeSession(row.id)}
                          type="button"
                          title={row.current ? "Logout this device" : "Revoke session"}
                        >
                          {row.current ? "Logout This Device" : "Revoke"}
                        </button>
                      ) : (
                        <span className="muted-line">None</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="loading">No sessions found.</div>
          )}
        </div>
      </section>

      <section className="panel">
        <h2>Sign-In Methods</h2>
        <div className="invite-stack">
          <article className="invite-card">
            <div className="invite-card-header">
              <div>
                <strong>Password</strong>
                <p>Password login remains available unless explicitly removed.</p>
              </div>
              <span className="status-chip">
                {signInMethods.passwordEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>
          </article>
          {(signInMethods.linkedProviders || []).map((method) => (
            <article className="invite-card" key={method.id}>
              <div className="invite-card-header">
                <div>
                  <strong>{method.provider}</strong>
                  <p>{method.email || "Linked social sign-in"}</p>
                </div>
                <span className="status-chip">Linked</span>
              </div>
              <div className="invite-meta">
                <span>
                  Updated {method.updatedAt ? new Date(method.updatedAt).toLocaleString() : "Unknown"}
                </span>
              </div>
              <div className="actions">
                <button
                  className="btn btn-danger"
                  disabled={saving}
                  onClick={() => unlinkMethod(method.id)}
                  type="button"
                >
                  Unlink
                </button>
              </div>
            </article>
          ))}
          {!signInMethods.linkedProviders?.length ? (
            <div className="loading">No linked social sign-in methods.</div>
          ) : null}
        </div>
      </section>

      <section className="panel">
        <h2>Account Activity</h2>
        <AuditTable
          audits={userAudits}
          emptyMessage="No account activity recorded."
          formatAudit={formatAudit}
        />
      </section>

      <section className="panel">
        <h2>Organization Invitations</h2>
        <ErrorBanner error={error} />
        <SuccessBanner message={success} />

        {!canManageOrganization ? (
          <p className="muted-copy">
            Organization invite management is available to organization admins and system admins.
          </p>
        ) : (
          <>
            <p className="muted-copy">
              Invite a Google account by email. The invite is consumed when the user signs in
              through the invite link and the Google account email matches.
            </p>

            <form className="invite-form" onSubmit={submitInvite}>
              <label className="field">
                <span>Invite Email</span>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </label>
              <button className="btn" disabled={saving} type="submit">
                {saving ? "Sending..." : "Send Invite"}
              </button>
            </form>

            <div className="filter-pills">
              {["all", "pending", "accepted", "revoked", "expired"].map((status) => (
                <button
                  key={status}
                  className={`btn ${inviteFilter === status ? "" : "btn-secondary"}`}
                  disabled={saving}
                  onClick={() => setInviteFilter(status)}
                  type="button"
                >
                  {status === "all" ? "All" : inviteStatusLabel(status)}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="loading">Loading invitations...</div>
            ) : organizationInvites.length ? (
              <div className="invite-stack">
                {organizationInvites.map((invite) => {
                  const inviteUrl = `${window.location.origin}/login?invite=${encodeURIComponent(
                    invite.token
                  )}`;
                  const isPending = invite.status === "pending";
                  return (
                    <article className="invite-card" key={invite.id}>
                      <div className="invite-card-header">
                        <div>
                          <strong>{invite.email}</strong>
                          <p>{inviteStatusLabel(invite.status)}</p>
                        </div>
                        <span className={`status-chip status-${invite.status || "unknown"}`}>
                          {inviteStatusLabel(invite.status)}
                        </span>
                      </div>
                      <div className="invite-meta">
                        <span>Created {invite.createdAt ? new Date(invite.createdAt).toLocaleString() : "Unknown"}</span>
                        <span>
                          Expires {invite.expiresAt ? new Date(invite.expiresAt).toLocaleString() : "Never"}
                        </span>
                        {invite.invitedByName ? <span>Invited by {invite.invitedByName}</span> : null}
                        {invite.acceptedAt ? (
                          <span>
                            Accepted {new Date(invite.acceptedAt).toLocaleString()}
                            {invite.acceptedByName ? ` by ${invite.acceptedByName}` : ""}
                          </span>
                        ) : null}
                        {invite.revokedAt ? (
                          <span>
                            Revoked {new Date(invite.revokedAt).toLocaleString()}
                            {invite.revokedByName ? ` by ${invite.revokedByName}` : ""}
                          </span>
                        ) : null}
                      </div>
                      {isPending ? (
                        <>
                          <label className="field field-full">
                            <span>Invite Link</span>
                            <input readOnly value={inviteUrl} />
                          </label>
                          <div className="actions">
                            <button
                              className="btn btn-secondary"
                              disabled={saving}
                              onClick={() => navigator.clipboard?.writeText(inviteUrl)}
                              type="button"
                            >
                              Copy Link
                            </button>
                            <button
                              className="btn btn-secondary"
                              disabled={saving}
                              onClick={() => resendInvite(invite.id)}
                              type="button"
                            >
                              Resend
                            </button>
                            <button
                              className="btn btn-danger"
                              disabled={saving}
                              onClick={() => revokeInvite(invite.id)}
                              type="button"
                            >
                              Revoke
                            </button>
                          </div>
                        </>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="loading">No invitations found.</div>
            )}

            <div className="filter-pills">
              {["all", "success", "pending", "blocked"].map((status) => (
                <button
                  key={status}
                  className={`btn ${auditOutcomeFilter === status ? "" : "btn-secondary"}`}
                  disabled={saving}
                  onClick={() => setAuditOutcomeFilter(status)}
                  type="button"
                >
                  {status === "all" ? "All Activity" : status}
                </button>
              ))}
            </div>
            <AuditTable
              audits={organizationAudits}
              emptyMessage="No organization activity for this filter."
              formatAudit={formatAudit}
            />
          </>
        )}
      </section>
    </div>
  );
}
