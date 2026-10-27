
import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";

import { auth, firebaseConfigured } from "../lib/firebase";

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";

function getAuthErrorMessage(code) {
  const messages = {
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/invalid-credential":
      "The email or password is incorrect. Please try again.",
    "auth/email-already-in-use":
      "An account with this email already exists. Please sign in.",
    "auth/weak-password":
      "Choose a stronger password with at least 8 characters.",
    "auth/too-many-requests":
      "Too many attempts. Please wait a little and try again.",
    "auth/popup-closed-by-user":
      "The Google sign-in window was closed before completion.",
    "auth/popup-blocked":
      "Your browser blocked the Google sign-in popup. Allow popups and retry.",
    "auth/unauthorized-domain":
      "This domain is not authorized in Firebase Authentication settings.",
    "auth/network-request-failed":
      "Network error. Check your connection and try again.",
    "auth/operation-not-allowed":
      "This sign-in provider is not enabled in Firebase Console.",
    "auth/user-disabled":
      "This account has been disabled. Please contact support.",
  };

  return messages[code] || "Something went wrong. Please try again.";
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.5 9.5 0 0 1-4.1 6.2l6.6 5.1c3.9-3.6 6.1-8.9 6.1-15Z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4l-6.8 5.2A20 20 0 0 0 24 44Z"
      />
      <path
        fill="#1976D2"
        d="M12.6 27.7a12 12 0 0 1 0-7.4l-6.8-5.2a20 20 0 0 0 0 17.8l6.8-5.2Z"
      />
      <path
        fill="#EA4335"
        d="M24 12.9c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 6.8 29.5 5 24 5A20 20 0 0 0 5.8 15.1l6.8 5.2c1.6-4.8 6.1-7.4 11.4-7.4Z"
      />
    </svg>
  );
}

export default function AuthForm({ initialMode = "signin" }) {
  const router = useRouter();
  const submittingRef = useRef(false);

  const isSignup = initialMode === "signup";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!firebaseConfigured || !auth) return undefined;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && !submittingRef.current) {
        router.replace("/dashboard");
      }
    });

    return unsubscribe;
  }, [router]);

  function clearMessages() {
    setError("");
    setNotice("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    clearMessages();

    if (!firebaseConfigured || !auth) {
      setError(
        "Firebase is not configured yet. Add the values to .env.local and restart the development server."
      );
      return;
    }

    const normalizedEmail = email.trim();

    if (isSignup && name.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }

    if (password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    if (isSignup && password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    setLoading(true);
    submittingRef.current = true;

    try {
      if (isSignup) {
        const credential = await createUserWithEmailAndPassword(
          auth,
          normalizedEmail,
          password
        );

        await updateProfile(credential.user, {
          displayName: name.trim(),
        });
      } else {
        await signInWithEmailAndPassword(
          auth,
          normalizedEmail,
          password
        );
      }

      await router.replace("/dashboard");
    } catch (err) {
      console.error("Authentication failed:", err.code);
      setError(getAuthErrorMessage(err.code));
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    clearMessages();

    if (!firebaseConfigured || !auth) {
      setError(
        "Firebase is not configured yet. Add your Firebase web config to .env.local."
      );
      return;
    }

    setLoading(true);
    submittingRef.current = true;

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      await signInWithPopup(auth, provider);
      await router.replace("/dashboard");
    } catch (err) {
      console.error("Google sign-in failed:", err.code);
      setError(getAuthErrorMessage(err.code));
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  async function handlePasswordReset() {
    clearMessages();

    if (!firebaseConfigured || !auth) {
      setError("Please configure Firebase before resetting passwords.");
      return;
    }

    if (!email.trim()) {
      setError("Enter your email address first, then choose Forgot password.");
      return;
    }

    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setNotice("Password reset instructions have been sent if the account exists.");
    } catch (err) {
      console.error("Password reset failed:", err.code);
      setError(getAuthErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>
          {isSignup ? "Create your account" : "Sign in"} | Triply
        </title>
        <meta
          name="description"
          content="Sign in or create your Triply account to plan and manage your journeys."
        />
      </Head>

      <main className="auth-page">
        <header className="auth-topbar">
          <Link className="brand" href="/" aria-label="Triply home">
            <span className="brand-mark">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m2 16 20-5-8-3-3-6-2 1 1 7-5 2-3-2-1 1 3 5Z" />
                <path d="m10 17-3 4" />
              </svg>
            </span>
            <span>
              triply<span className="brand-period">.</span>
            </span>
          </Link>

          <Link href="/" className="auth-home-link">
            Back to home <span>↗</span>
          </Link>
        </header>

        <div className="auth-layout">
          <section className="auth-showcase">
            <div className="auth-showcase-overlay" />

            <div className="auth-showcase-top">
              <span className="auth-showcase-dot" />
              TRAVEL YOUR WAY
            </div>

            <div className="auth-showcase-content">
              <p className="auth-showcase-kicker">YOUR NEXT CHAPTER</p>

              <h1>
                The world
                <br />
                is waiting
                <br />
                <span>for you.</span>
              </h1>

              <p className="auth-showcase-description">
                Thoughtful trips, your kind of experiences, and more time
                making memories.
              </p>
            </div>

            <div className="auth-showcase-bottom">
              <span className="auth-showcase-star">✳</span>
              <p>
                Your people. Your budget.
                <br />
                <strong>Your kind of adventure.</strong>
              </p>
            </div>
          </section>

          <section className="auth-panel">
            <div className="auth-panel-heading">
              <p className="auth-overline">
                {isSignup ? "A NEW ADVENTURE BEGINS" : "WELCOME BACK"}
              </p>

              <h2>
                {isSignup ? "Create your account" : "Let’s get you going."}
              </h2>

              <p className="auth-subtitle">
                {isSignup
                  ? "Join Triply and start planning trips that feel like you."
                  : "Sign in to continue planning your next journey."}
              </p>
            </div>

            <div className="auth-tabs">
              <Link
                href="/login"
                className={`auth-tab ${!isSignup ? "active" : ""}`}
                aria-current={!isSignup ? "page" : undefined}
              >
                Sign in
              </Link>

              <Link
                href="/signup"
                className={`auth-tab ${isSignup ? "active" : ""}`}
                aria-current={isSignup ? "page" : undefined}
              >
                Create account
              </Link>
            </div>

            <button
              type="button"
              className="auth-google-button"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <GoogleMark />
              Continue with Google
            </button>

            <div className="auth-divider">
              <span />
              <p>OR CONTINUE WITH EMAIL</p>
              <span />
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              {isSignup && (
                <label className="auth-field">
                  <span>FULL NAME</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                    maxLength={100}
                    required
                  />
                </label>
              )}

              <label className="auth-field">
                <span>EMAIL ADDRESS</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </label>

              <label className="auth-field">
                <span>PASSWORD</span>

                <div className="auth-password-wrap">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={
                      isSignup ? "At least 8 characters" : "Your password"
                    }
                    autoComplete={
                      isSignup ? "new-password" : "current-password"
                    }
                    minLength={8}
                    required
                  />

                  <button
                    type="button"
                    className="auth-show-password"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </label>

              {isSignup && (
                <label className="auth-field">
                  <span>CONFIRM PASSWORD</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Enter your password again"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </label>
              )}

              {!isSignup && (
                <div className="auth-forgot-row">
                  <button
                    type="button"
                    className="auth-text-button"
                    onClick={handlePasswordReset}
                    disabled={loading}
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {error && (
                <div className="auth-message auth-error" role="alert">
                  {error}
                </div>
              )}

              {notice && (
                <div className="auth-message auth-success" role="status">
                  {notice}
                </div>
              )}

              {!firebaseConfigured && (
                <div className="auth-message auth-config-notice">
                  Authentication setup is incomplete. Configure your Firebase
                  project and `.env.local` before testing sign-in.
                </div>
              )}

              <button
                className="auth-submit-button"
                type="submit"
                disabled={loading}
              >
                {loading
                  ? "Please wait..."
                  : isSignup
                    ? "Create my account"
                    : "Sign in to Triply"}

                {!loading && <span>→</span>}
              </button>
            </form>

            <p className="auth-legal">
              By continuing, you agree to use Triply responsibly. Your account
              allows you to access your own trips and preferences.
            </p>

            <p className="auth-bottom-note">
              {isSignup ? "Already have an account?" : "New to Triply?"}{" "}
              <Link href={isSignup ? "/login" : "/signup"}>
                {isSignup ? "Sign in" : "Create an account"}
              </Link>
            </p>
          </section>
        </div>

        <footer className="auth-footer">
          <span>© {new Date().getFullYear()} Triply</span>
          <span>Thoughtful trips. Unforgettable stories.</span>
        </footer>
      </main>
    </>
  );
}
