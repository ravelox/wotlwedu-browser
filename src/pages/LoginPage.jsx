import { useEffect, useRef, useState } from "react";
import { ErrorBanner } from "../components/Feedback";
import logo from "../assets/logo.png";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export default function LoginPage({ api, onLogin, appVersion }) {
  const [email, setEmail] = useState("root@localhost.localdomain");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [totp, setTotp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pending2fa, setPending2fa] = useState(null); // { userId, verificationToken }
  const [invite, setInvite] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [pendingLink, setPendingLink] = useState(null);
  const googleButtonRef = useRef(null);
  const inviteTokenRef = useRef("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get("invite") || "";
    inviteTokenRef.current = inviteToken;

    if (!inviteToken) return undefined;

    let cancelled = false;

    async function loadInvite() {
      setInviteLoading(true);
      try {
        const response = await api.get(`/login/invite/${encodeURIComponent(inviteToken)}`);
        if (response.status >= 400) {
          if (!cancelled) {
            setInvite(null);
            setError(response.data?.message || "Invite not found");
          }
          return;
        }
        if (!cancelled) {
          setInvite(response.data?.data?.invite || response.data?.invite || null);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Invite not found");
      } finally {
        if (!cancelled) setInviteLoading(false);
      }
    }

    loadInvite();
    return () => {
      cancelled = true;
    };
  }, [api]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || pending2fa) return undefined;

    let cancelled = false;
    let script = document.querySelector('script[data-google-gsi="true"]');

    async function handleGoogleCredentialResponse(response) {
      setLoading(true);
      setError("");
      setPendingLink(null);

      try {
        const loginResponse = await api.post("/login/google", {
          idToken: response?.credential,
          inviteToken: inviteTokenRef.current || undefined,
        });
        if (loginResponse.status >= 400) {
          setError(loginResponse.data?.message || "Google sign-in failed");
          return;
        }
        if (loginResponse.data?.data?.linkRequired) {
          setPendingLink({
            linkToken: loginResponse.data.data.linkToken,
            provider: loginResponse.data.data.provider || "google",
          });
          return;
        }
        onLogin(loginResponse.data);
      } catch (err) {
        setError(err.message || "Google sign-in failed");
      } finally {
        setLoading(false);
      }
    }

    function renderGoogleButton() {
      if (cancelled || !window.google?.accounts?.id || !googleButtonRef.current) {
        return;
      }

      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredentialResponse,
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        text: "signin_with",
        shape: "pill",
        width: "320",
      });
    }

    if (window.google?.accounts?.id) {
      renderGoogleButton();
      return () => {
        cancelled = true;
      };
    }

    if (!script) {
      script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.dataset.googleGsi = "true";
      document.head.appendChild(script);
    }

    script.addEventListener("load", renderGoogleButton);

    return () => {
      cancelled = true;
      script?.removeEventListener("load", renderGoogleButton);
    };
  }, [api, onLogin, pending2fa]);

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
    setPendingLink(null);

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

  const confirmPendingLink = async () => {
    if (!pendingLink?.linkToken) return;

    setError("");
    setLoading(true);

    try {
      const response = await api.post("/login/google/link", {
        linkToken: pendingLink.linkToken,
      });
      if (response.status >= 400) {
        setError(response.data?.message || "Google link confirmation failed");
        return;
      }
      setPendingLink(null);
      onLogin(response.data);
    } catch (err) {
      setError(err.message || "Google link confirmation failed");
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
        <p className="login-version">Version {appVersion}</p>
        <ErrorBanner error={error} />
        {invite ? (
          <div className="invite-banner">
            <strong>Invitation ready</strong>
            <span>
              Sign in with Google to join {invite.organizationName} as {invite.email}.
            </span>
          </div>
        ) : null}
        {inviteLoading ? <div className="loading">Checking invite...</div> : null}
        {pendingLink ? (
          <div className="invite-banner">
            <strong>Confirmation required</strong>
            <span>
              Google authentication succeeded. Confirm to link this Google sign-in to your
              existing Wotlwedu account.
            </span>
            <div className="password-row">
              <button className="btn" type="button" disabled={loading} onClick={confirmPendingLink}>
                {loading ? "Confirming..." : "Confirm Link"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={loading}
                onClick={() => setPendingLink(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
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
            {GOOGLE_CLIENT_ID ? (
              <>
                <div className="auth-divider" aria-hidden="true">
                  <span />
                  <span>or continue with Google</span>
                  <span />
                </div>
                <div className="google-signin-slot" ref={googleButtonRef} />
              </>
            ) : null}
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
