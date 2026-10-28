import "@/styles/globals.css";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";

import { auth, firebaseConfigured } from "@/lib/firebase";

const PUBLIC_ROUTES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
];

function AuthLoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="text-center">
        <div
          className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600"
          role="status"
          aria-label="Loading"
        />

        <p className="mt-4 text-sm font-medium text-slate-600">
          Checking your Triply session...
        </p>
      </div>
    </main>
  );
}

export default function App({ Component, pageProps }) {
  const router = useRouter();

  const [authState, setAuthState] = useState({
    loading: true,
    user: null,
  });

  const isPublicRoute = PUBLIC_ROUTES.includes(router.pathname);

  useEffect(() => {
    if (!firebaseConfigured || !auth) {
      setAuthState({
        loading: false,
        user: null,
      });

      return undefined;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setAuthState({
          loading: false,
          user,
        });
      },
      (error) => {
        console.error(
          "Triply authentication state error:",
          error.code || error.message
        );

        setAuthState({
          loading: false,
          user: null,
        });
      }
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!router.isReady || authState.loading) {
      return;
    }

    if (!firebaseConfigured || !auth) {
      if (!isPublicRoute) {
        router.replace("/login");
      }

      return;
    }

    if (!authState.user && !isPublicRoute) {
      router.replace("/login");
    }
  }, [
    router.isReady,
    router.pathname,
    authState.loading,
    authState.user,
    isPublicRoute,
  ]);

  if (!router.isReady || authState.loading) {
    return <AuthLoadingScreen />;
  }

  if (!firebaseConfigured || !auth) {
    return isPublicRoute ? (
      <Component {...pageProps} />
    ) : (
      <AuthLoadingScreen />
    );
  }

  if (!authState.user && !isPublicRoute) {
    return <AuthLoadingScreen />;
  }

  return <Component {...pageProps} />;
}