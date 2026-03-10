import { useEffect, useState } from "react";
import { ErrorBanner, SuccessBanner } from "../components/Feedback";
import { toApiError } from "../lib/api";

export default function TokenLabPage({ api, session, onApplyToken }) {
  const [targetUserId, setTargetUserId] = useState(session?.userId || "");
  const [targetUserQuery, setTargetUserQuery] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [expiresInMinutes, setExpiresInMinutes] = useState(60);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const getUserLabel = (user) => {
    if (!user) return "";
    return user.fullName || user.alias || user.email || user.id || "";
  };

  useEffect(() => {
    if (session?.systemAdmin !== true) return;
    let cancelled = false;
    const loadUsers = async () => {
      setUsersLoading(true);
      try {
        const response = await api.get("/user", {
          params: { page: 1, items: 1000 },
        });
        if (response.status >= 400) {
          throw toApiError(response, "Failed to load users");
        }
        const users = response.data?.data?.users || response.data?.users || [];
        if (!cancelled) {
          setAllUsers(Array.isArray(users) ? users : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setUsersLoading(false);
        }
      }
    };
    loadUsers();
    return () => {
      cancelled = true;
    };
  }, [api, session?.systemAdmin]);

  useEffect(() => {
    if (!targetUserId) {
      setTargetUserQuery("");
      return;
    }
    const selectedUser = allUsers.find((user) => user.id === targetUserId);
    setTargetUserQuery(selectedUser ? getUserLabel(selectedUser) : targetUserId);
  }, [allUsers, targetUserId]);

  const onGenerate = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    setResult(null);
    try {
      const response = await api.post("/login/testtoken", {
        userId: targetUserId,
        expiresInMinutes: Number(expiresInMinutes),
      });
      if (response.status >= 400) {
        throw toApiError(response, "Failed to generate token");
      }
      const data = response.data?.data || response.data || {};
      setResult(data);
      setSuccess(`Generated token for ${data.userId} (expires ${data.expiresAt})`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onCopy = async () => {
    if (!result?.authToken) return;
    try {
      await navigator.clipboard.writeText(result.authToken);
      setSuccess("Bearer token copied to clipboard");
    } catch {
      setError("Unable to copy token to clipboard");
    }
  };

  const onUseToken = () => {
    if (!result?.authToken) return;
    onApplyToken(result);
    setSuccess(`Applied token for ${result.userId} to current browser session`);
  };

  const onRevoke = async () => {
    if (!result?.tokenId) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await api.post("/login/testtoken/revoke", {
        tokenId: result.tokenId,
      });
      if (response.status >= 400) {
        throw toApiError(response, "Failed to revoke token");
      }
      const revokedAt = response.data?.data?.revokedAt || new Date().toISOString();
      setResult((prev) => ({
        ...(prev || {}),
        revokedAt,
      }));
      setSuccess(`Revoked token ${result.tokenId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (session?.systemAdmin !== true) {
    return (
      <div className="panel">
        <h2>Token Lab</h2>
        <ErrorBanner error="System admin access required." />
      </div>
    );
  }

  return (
    <div className="panel">
      <h2>Token Lab</h2>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        Generate a testing bearer token for any active user with custom expiration.
      </p>
      <ErrorBanner error={error} />
      <SuccessBanner message={success} />

      <div className="form-grid">
        <label className="field">
          <span>User Name</span>
          <input
            type="text"
            list="token-lab-user-options"
            value={targetUserQuery}
            onChange={(e) => {
              const query = e.target.value;
              const trimmed = query.trim();
              const byLabel = allUsers.find((user) => {
                const label = getUserLabel(user);
                return label.toLowerCase() === trimmed.toLowerCase();
              });
              const byId = allUsers.find((user) => user.id === trimmed);
              setTargetUserQuery(query);
              setTargetUserId(byLabel?.id || byId?.id || "");
            }}
            placeholder="Type name, alias, or email"
          />
          <datalist id="token-lab-user-options">
            {allUsers.map((user) => (
              <option key={user.id} value={getUserLabel(user)} />
            ))}
          </datalist>
          <small style={{ color: "var(--muted)" }}>
            {usersLoading
              ? "Loading users..."
              : targetUserId
                ? `Selected ID: ${targetUserId}`
                : "Select a user by name, alias, or email."}
          </small>
        </label>
        <label className="field">
          <span>Token Duration (minutes)</span>
          <input
            type="number"
            min={1}
            max={43200}
            step={1}
            value={expiresInMinutes}
            onChange={(e) => setExpiresInMinutes(e.target.value)}
          />
        </label>
      </div>

      <div className="actions">
        <button className="btn" onClick={onGenerate} disabled={loading || !targetUserId}>
          {loading ? "Generating..." : "Generate Token"}
        </button>
        <button className="btn btn-secondary" onClick={onCopy} disabled={!result?.authToken}>
          Copy Token
        </button>
        <button className="btn btn-secondary" onClick={onUseToken} disabled={!result?.authToken}>
          Use In Session
        </button>
        <button
          className="btn btn-danger"
          onClick={onRevoke}
          disabled={!result?.tokenId || !!result?.revokedAt || loading}
        >
          Revoke Token
        </button>
      </div>

      {result?.authToken && (
        <div style={{ marginTop: 12 }}>
          <label className="field field-full">
            <span>Bearer Token</span>
            <textarea value={result.authToken} readOnly rows={8} />
          </label>
          <small style={{ color: "var(--muted)" }}>
            User: {result.userId} | Token ID: {result.tokenId} | Expires: {result.expiresAt}
            {result.revokedAt ? ` | Revoked: ${result.revokedAt}` : ""}
          </small>
        </div>
      )}
    </div>
  );
}
