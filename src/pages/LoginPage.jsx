import { useState } from "react";
import { ErrorBanner } from "../components/Feedback";
import logo from "../assets/logo.png";

export default function LoginPage({ api, onLogin }) {
  const [email, setEmail] = useState("root@localhost.localdomain");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/login", { email, password });
      if (response.status === 302) {
        setError("2FA verification required. Complete this flow using the mobile/minimal client first.");
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

  return (
    <div className="login-page">
      <div className="login-card">
        <img src={logo} alt="wotlwedu logo" className="login-logo" />
        <h1>wotlwedu Browser Console</h1>
        <p>Desktop management UI for the wotlwedu backend.</p>
        <ErrorBanner error={error} />
        <form onSubmit={submit}>
          <label>
            <span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            <span>Password (bcrypt hash supported by backend reset workflow)</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <button className="btn" disabled={loading} type="submit">
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
