import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { isAllowedEmail } from "../allowedEmails";

const googleProvider = new GoogleAuthProvider();

export default function LoginPage() {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (user) {
    navigate(role === "admin" ? "/admin" : "/profile", { replace: true });
    return null;
  }

  function switchMode(next) {
    setMode(next);
    setError(null);
    setPassword("");
    setConfirmPassword("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!isAllowedEmail(email)) {
      setError("This email is not authorised. Please use your Blackline email address.");
      return;
    }

    if (mode === "create") {
      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === "signin") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await ensureUserDoc(cred.user.uid, cred.user.email, cred.user.displayName);
      }
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setGoogleLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      if (!isAllowedEmail(cred.user.email)) {
        await auth.signOut();
        setError("This Google account is not authorised. Please use your Blackline email address.");
        return;
      }
      await ensureUserDoc(cred.user.uid, cred.user.email, cred.user.displayName);
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError(friendlyError(err.code));
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  const busy = loading || googleLoading;

  return (
    <div className="min-h-screen bg-[var(--bg-main)] flex flex-col items-center justify-center px-4">

      {/* Card */}
      <div className="w-full max-w-[360px]">

        {/* Header strip */}
        <div className="bg-[var(--bg-header)] px-8 py-6 flex flex-col items-center gap-1">
          <span
            className="font-bold tracking-tight text-white"
            style={{ fontFamily: "var(--font-sans)", fontSize: "1.25rem", letterSpacing: "0.05em" }}
          >
            BLACKLINE
          </span>
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.7rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Staff Resumes
          </span>
        </div>

        {/* Red accent bar */}
        <div style={{ height: 3, background: "var(--accent-main)" }} />

        {/* Body */}
        <div className="bg-[var(--bg-panel)] border-x border-b border-[var(--border-main)] px-8 py-7 space-y-5">

          {/* Mode tabs */}
          <div className="flex text-xs font-semibold tracking-wider uppercase border border-[var(--border-main)]">
            {["signin", "create"].map((m, i) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`flex-1 py-2.5 transition-colors ${
                  i > 0 ? "border-l border-[var(--border-main)]" : ""
                } ${
                  mode === m
                    ? "bg-[var(--accent-main)] text-white"
                    : "bg-white text-[var(--text-muted)] hover:bg-[var(--bg-main)]"
                }`}
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={busy}
            className="w-full flex items-center justify-center gap-3 border border-[var(--border-main)] bg-white hover:bg-[var(--bg-main)] disabled:opacity-50 text-[var(--text-muted)] text-sm font-medium py-2.5 transition-colors"
          >
            {googleLoading ? (
              <span>Connecting…</span>
            ) : (
              <>
                <GoogleIcon />
                Continue with Google
              </>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--border-main)]" />
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              or
            </span>
            <div className="flex-1 h-px bg-[var(--border-main)]" />
          </div>

          {/* Email / password form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Email">
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@blacklineconsulting.ca"
                className="input-field"
              />
            </Field>

            <Field label="Password">
              <input
                type="password"
                autoComplete={mode === "create" ? "new-password" : "current-password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field"
              />
            </Field>

            {mode === "create" && (
              <Field label="Confirm password">
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field"
                />
              </Field>
            )}

            {error && (
              <p className="text-sm" style={{ color: "var(--accent-main)" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-[var(--accent-main)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white font-semibold text-sm py-2.5 transition-colors tracking-wide"
            >
              {loading
                ? mode === "create" ? "Creating account…" : "Signing in…"
                : mode === "create" ? "Create account" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label
        style={{
          display: "block",
          fontSize: "0.65rem",
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

async function ensureUserDoc(uid, email, displayName) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      email: email ?? "",
      display_name: displayName ?? "",
      role: "staff",
      staff_id: null,
      created_at: new Date().toISOString(),
    });
  }
}

function friendlyError(code) {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password.";
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/weak-password":
      return "Password is too weak. Use at least 8 characters.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    case "auth/network-request-failed":
      return "Network error. Check your connection.";
    case "auth/popup-blocked":
      return "Pop-up blocked by your browser. Allow pop-ups and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
