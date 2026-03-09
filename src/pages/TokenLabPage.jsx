import { useState } from "react";
import { ErrorBanner, SuccessBanner } from "../components/Feedback";
import { toApiError } from "../lib/api";

export default function TokenLabPage({ api, session, onApplyToken }) {
  const [targetUserId, setTargetUserId] = useState(session?.userId || "");
  const [expiresInMinutes, setExpiresInMinutes] = useState(60);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

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
          <span>Target User ID</span>
          <input
            type="text"
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            placeholder="user_123"
          />
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
        <button className="btn" onClick={onGenerate} disabled={loading}>
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
