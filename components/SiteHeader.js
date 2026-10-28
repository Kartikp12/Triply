import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../lib/firebase";

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState("");

  const links = [
    { label: "Discover", href: "#discover" },
    { label: "How it works", href: "#how-it-works" },
    { label: "Plan a trip", href: "#start-planning" },
  ];

  useEffect(() => {
    if (!auth) {
      setAuthReady(true);
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setAuthUser(user);
        setAuthReady(true);
        setAuthError("");
      },
      (error) => {
        console.error(
          "Header authentication error:",
          error.code || error.message
        );
        setAuthReady(true);
      }
    );

    return unsubscribe;
  }, []);

  function closeMenu() {
    setMenuOpen(false);
  }

  async function handleSignOut() {
    if (!auth) return;

    setAuthError("");

    try {
      await signOut(auth);
      setMenuOpen(false);

      // _app.js redirects the signed-out user to /login.
    } catch (error) {
      console.error(
        "Triply sign-out failed:",
        error.code || error.message
      );

      setAuthError("Unable to sign out. Please try again.");
    }
  }

  function AuthActions({ mobile = false }) {
    const baseButton =
      "inline-flex min-h-10 items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition";

    if (!authReady) return null;

    if (authUser) {
      return (
        <>
          <a
            href="/dashboard"
            onClick={mobile ? closeMenu : undefined}
            className={
              mobile
                ? "rounded-xl px-4 py-3 text-sm font-semibold text-[#203e32] hover:bg-[#eaf2e7]"
                : `${baseButton} text-[#203e32] hover:bg-[#eaf2e7]`
            }
          >
            Dashboard
          </a>

          <button
            type="button"
            onClick={handleSignOut}
            className={
              mobile
                ? "rounded-xl px-4 py-3 text-left text-sm font-semibold text-red-700 hover:bg-red-50"
                : `${baseButton} border border-[#e0e5db] text-[#203e32] hover:bg-[#eaf2e7]`
            }
          >
            Sign out
          </button>
        </>
      );
    }

    return (
      <>
        <a
          href="/login"
          onClick={mobile ? closeMenu : undefined}
          className={
            mobile
              ? "rounded-xl px-4 py-3 text-sm font-semibold text-[#203e32] hover:bg-[#eaf2e7]"
              : `${baseButton} text-[#203e32] hover:bg-[#eaf2e7]`
          }
        >
          Sign in
        </a>

        <a
          href="/signup"
          onClick={mobile ? closeMenu : undefined}
          className={
            mobile
              ? "flex items-center justify-center rounded-full border border-[#203e32] px-5 py-3 text-sm font-semibold text-[#203e32] hover:bg-[#eaf2e7]"
              : `${baseButton} border border-[#203e32] text-[#203e32] hover:bg-[#eaf2e7]`
          }
        >
          Create account
        </a>
      </>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[#e9eae2] bg-[#f8f8f2]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
        <a
          href="#home"
          aria-label="Triply home"
          onClick={closeMenu}
          className="flex shrink-0 items-center gap-2.5"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#203e32] text-lg text-white">
            ✈
          </span>

          <span className="text-[27px] font-semibold tracking-tight text-[#203e32]">
            triply<span className="text-[#16816e]">.</span>
          </span>
        </a>

        <nav className="hidden items-center gap-5 lg:flex xl:gap-7">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="whitespace-nowrap text-sm font-medium text-[#647168] transition hover:text-[#176f60]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden shrink-0 items-center gap-2 lg:flex xl:gap-3">
          <AuthActions />

          <a
            href="#start-planning"
            className="inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-full bg-[#203e32] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#176f60] xl:px-5"
          >
            Start planning <span aria-hidden="true">↗</span>
          </a>
        </div>

        <button
          type="button"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((current) => !current)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#e0e5db] bg-white text-xl text-[#203e32] lg:hidden"
        >
          {menuOpen ? "×" : "☰"}
        </button>
      </div>

      {menuOpen && (
        <nav className="border-t border-[#e9eae2] bg-[#f8f8f2] px-5 py-4 lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className="rounded-xl px-4 py-3 text-sm font-medium text-[#435a4a] transition hover:bg-[#eaf2e7]"
              >
                {link.label}
              </a>
            ))}

            <div className="my-2 border-t border-[#e9eae2]" />

            <AuthActions mobile />

            <a
              href="#start-planning"
              onClick={closeMenu}
              className="mt-2 flex items-center justify-center gap-2 rounded-full bg-[#203e32] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#176f60]"
            >
              Start planning ↗
            </a>
          </div>
        </nav>
      )}

      {authError && (
        <p
          role="alert"
          className="border-t border-red-100 bg-red-50 px-4 py-2 text-center text-sm text-red-700"
        >
          {authError}
        </p>
      )}
    </header>
  );
}