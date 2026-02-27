import { useState } from "react";
import { ErrorBanner } from "../components/Feedback";
import logo from "../assets/logo.png";

export default function LoginPage({ api, onLogin }) {
  const [email, setEmail] = useState("root@localhost.localdomain");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [totp, setTotp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pending2fa, setPending2fa] = useState(null); // { userId, verificationToken }

  function parse2faRedirect(toURL) {
    if (!toURL || typeof toURL !== "string") return null;
    // Expected: /auth/verify/:userId/:verificationToken
    const parts = toURL.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const verificationToken = parts[parts.length - 1];
    const userId = parts[parts.length - 2];
    if (!userId || !verificationToken) return null;
    return { userId, verificationToken };
  }

  const submitCredentials = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/login", { email, password });
      if (response.status === 302) {
        const parsed = parse2faRedirect(response.data?.data?.toURL);
        if (!parsed) {
          setError("2FA verification required, but no verification token was provided by the API.");
          return;
        }
        setPending2fa(parsed);
        setTotp("");
        return;
      }
      if (response.status >= 400) {
        setError(response.data?.message || "Login failed");
        return;
      }
      onLogin(response.data);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const submit2fa = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/login/verify2fa", {
        userId: pending2fa?.userId,
        verificationToken: pending2fa?.verificationToken,
        authToken: totp,
      });

      if (response.status >= 400) {
        setError(response.data?.message || "2FA verification failed");
        return;
      }
      onLogin(response.data);
    } catch (err) {
      setError(err.message || "2FA verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <img src={logo} alt="wotlwedu logo" className="login-logo" />
        <h1>wotlwedu Browser Console</h1>
        <p>Desktop management UI for the wotlwedu backend.</p>
        <ErrorBanner error={error} />
        {!pending2fa ? (
          <form onSubmit={submitCredentials}>
            <label>
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
              />
            </label>
            <label>
              <span>Password</span>
              <div className="password-row">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>
            <button className="btn" disabled={loading} type="submit">
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        ) : (
          <form onSubmit={submit2fa}>
            <label>
              <span>2FA Code</span>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                value={totp}
                onChange={(e) => setTotp(e.target.value)}
                placeholder="123456"
                required
              />
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn" disabled={loading} type="submit">
                {loading ? "Verifying..." : "Verify"}
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                disabled={loading}
                onClick={() => {
                  setPending2fa(null);
                  setTotp("");
                  setError("");
                }}
              >
                Back
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
