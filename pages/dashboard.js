import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged, signOut } from "firebase/auth";

import { auth, firebaseConfigured } from "../lib/firebase";

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!firebaseConfigured || !auth) {
      setChecking(false);
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setChecking(false);

      if (!currentUser) {
        router.replace("/login");
      }
    });

    return unsubscribe;
  }, [router]);

  async function handleSignOut() {
    if (!auth) return;

    setError("");

    try {
      await signOut(auth);
      await router.replace("/");
    } catch (err) {
      console.error("Sign out failed:", err.code);
      setError("Unable to sign out right now. Please try again.");
    }
  }

  if (!firebaseConfigured) {
    return (
      <main className="dashboard-state">
        <h1>Finish Firebase setup</h1>
        <p>
          Add your Firebase web configuration to `.env.local`, then restart
          your development server.
        </p>
        <Link className="button-primary" href="/">
          Back to Triply
        </Link>
      </main>
    );
  }

  if (checking || !user) {
    return (
      <main className="dashboard-state">
        <p>Checking your Triply account...</p>
      </main>
    );
  }

  return (
    <>
      <Head>
        <title>My Triply Dashboard</title>
        <meta name="description" content="Your personal Triply dashboard." />
      </Head>

      <main className="dashboard-page">
        <header className="dashboard-header">
          <Link className="brand" href="/">
            <span className="brand-mark">✳</span>
            <span>
              triply<span className="brand-period">.</span>
            </span>
          </Link>

          <button
            type="button"
            className="dashboard-signout"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </header>

        <section className="dashboard-welcome">
          <p className="auth-overline">YOUR NEXT CHAPTER</p>

          <h1>
            Welcome{user.displayName ? `, ${user.displayName.split(" ")[0]}` : ""}.
          </h1>

          <p>
            Your next adventure starts here. Let&apos;s make a trip that feels
            like you.
          </p>

          <Link className="button-primary" href="/#start-planning">
            Plan a new trip <span>→</span>
          </Link>
        </section>

        <section className="dashboard-account">
          <div>
            <p className="auth-overline">YOUR ACCOUNT</p>
            <h2>Account details</h2>
            <p>{user.displayName || "Triply traveller"}</p>
            <p>{user.email}</p>
          </div>

          <div className="dashboard-status">
            <span />
            Signed in
          </div>
        </section>

        <section className="dashboard-empty">
          <span className="dashboard-empty-icon">✳</span>
          <h2>Your travel stories will live here.</h2>
          <p>
            Your account is connected. Saved trips, three-plan comparisons and
            plan-specific AI conversations will appear here after we implement
            trip persistence in Firestore.
          </p>
          <Link href="/#start-planning" className="text-link">
            Explore trip planning <span>→</span>
          </Link>
        </section>

        {error && (
          <p className="planner-notice" role="alert">
            {error}
          </p>
        )}
      </main>
    </>
  );
}