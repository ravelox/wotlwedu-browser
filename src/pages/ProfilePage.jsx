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

export default function ProfilePage({ api, session }) {
  const [organization, setOrganization] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFilter, setInviteFilter] = useState("all");
  const [organizationInvites, setOrganizationInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canManageOrganization =
    session?.organizationId &&
    (session?.organizationAdmin === true || session?.systemAdmin === true);

  async function loadInvites() {
    if (!canManageOrganization) {
      setOrganization(null);
      setOrganizationInvites([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [organizationResponse, inviteResponse] = await Promise.all([
        api.get(`/organization/${session.organizationId}`),
        api.get(`/organization/${session.organizationId}/invite`, {
          params: inviteFilter === "all" ? undefined : { status: inviteFilter },
        }),
      ]);

      if (organizationResponse.status >= 400) {
        throw toApiError(organizationResponse, "Failed to load organization");
      }
      if (inviteResponse.status >= 400) {
        throw toApiError(inviteResponse, "Failed to load invitations");
      }

      setOrganization(
        organizationResponse.data?.data?.organization ||
          organizationResponse.data?.organization ||
          null
      );
      setOrganizationInvites(
        inviteResponse.data?.data?.invites || inviteResponse.data?.invites || []
      );
    } catch (err) {
      setError(err.message || "Failed to load invitations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInvites().catch(() => {});
  }, [inviteFilter, session?.organizationId, canManageOrganization]);

  async function submitInvite(event) {
    event.preventDefault();
    if (!session?.organizationId || !inviteEmail) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.post(`/organization/${session.organizationId}/invite`, {
        email: inviteEmail,
      });
      if (response.status >= 400) {
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
        `/organization/${session.organizationId}/invite/${inviteId}/resend`
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
        `/organization/${session.organizationId}/invite/${inviteId}`
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

  return (
    <div className="profile-stack">
      <section className="panel">
        <h2>Profile</h2>
        <div className="profile-grid">
          <div>
            <span className="profile-label">User</span>
            <strong>{session?.alias || session?.email || "User"}</strong>
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
                    ? "Workgroup Admin"
                    : "User"}
            </strong>
          </div>
        </div>
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
                        {invite.acceptedAt ? (
                          <span>
                            Accepted {new Date(invite.acceptedAt).toLocaleString()}
                          </span>
                        ) : null}
                        {invite.revokedAt ? (
                          <span>
                            Revoked {new Date(invite.revokedAt).toLocaleString()}
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
          </>
        )}
      </section>
    </div>
  );
}
