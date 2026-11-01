import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";

import { auth, firebaseConfigured } from "../lib/firebase";
import {
  deleteSavedTrip,
  getSavedTrips,
} from "../lib/savedTrips";

function formatCurrency(amount, currency = "INR") {
  if (
    amount == null ||
    !Number.isFinite(Number(amount))
  ) {
    return "Budget not set";
  }

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(Number(amount));
  } catch {
    return `${currency} ${Number(amount).toLocaleString("en-IN")}`;
  }
}

function formatDate(value) {
  if (!value) return "Dates not set";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "Dates not set";
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function MyTripsPage() {
  const [user, setUser] = useState(null);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!firebaseConfigured || !auth) {
      setError("Firebase is not configured. Please check your setup.");
      setLoading(false);
      return undefined;
    }

    let active = true;

    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (!active) return;

        setUser(currentUser);

        if (!currentUser) {
          setTrips([]);
          setLoading(false);
          return;
        }

        setLoading(true);
        setError("");

        try {
          const savedTrips = await getSavedTrips(currentUser.uid);

          if (active) {
            setTrips(savedTrips);
          }
        } catch (loadError) {
          console.error("Unable to load saved trips:", loadError);

          if (active) {
            setError(
              "We couldn't load your saved trips. Check your connection and Firestore rules, then try again."
            );
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  async function handleDelete(tripId) {
    const confirmed = window.confirm(
      "Delete this saved trip and all three plan options? This cannot be undone."
    );

    if (!confirmed || !user) return;

    setDeletingId(tripId);
    setError("");

    try {
      await deleteSavedTrip(user.uid, tripId);

      setTrips((current) =>
        current.filter((trip) => trip.id !== tripId)
      );
    } catch (deleteError) {
      console.error("Unable to delete saved trip:", deleteError);
      setError("We couldn't delete this trip. Please try again.");
    } finally {
      setDeletingId("");
    }
  }

  return (
    <>
      <Head>
        <title>My Trips | Triply</title>

        <meta
          name="description"
          content="View and manage your saved Triply journeys."
        />
      </Head>

      <main className="min-h-screen bg-[#f8f8f2] text-[#243c30]">
        <header className="border-b border-[#e5e8df] bg-white/80">
          <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8">
            <Link
              href="/"
              className="text-2xl font-semibold tracking-tight"
            >
              triply<span className="text-[#16816e]">.</span>
            </Link>

            <nav className="flex items-center gap-3 text-sm font-semibold">
              <Link
                href="/dashboard"
                className="rounded-full px-4 py-2 hover:bg-[#edf2e9]"
              >
                Dashboard
              </Link>

              <Link
                href="/#start-planning"
                className="rounded-full bg-[#203e32] px-4 py-2 text-white hover:bg-[#176f60]"
              >
                Plan a trip ↗
              </Link>
            </nav>
          </div>
        </header>

        <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#16816e]">
                YOUR JOURNEY COLLECTION
              </p>

              <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
                My saved trips
                <span className="font-serif italic text-[#16816e]">
                  .
                </span>
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-7 text-[#69756c] sm:text-base">
                Every trip you save, with all three personalised plan
                options in one place.
              </p>
            </div>

            <Link
              href="/#start-planning"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#203e32] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#176f60]"
            >
              + Create a new trip
            </Link>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {loading ? (
            <div className="mt-12 rounded-3xl border border-[#e5e8df] bg-white px-6 py-16 text-center">
              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-[#dce9df] border-t-[#16816e]" />

              <p className="mt-4 text-sm text-[#69756c]">
                Loading your saved trips...
              </p>
            </div>
          ) : trips.length === 0 ? (
            <div className="mt-12 rounded-[28px] border border-dashed border-[#cbd6ca] bg-white px-6 py-16 text-center sm:px-12">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#edf4e9] text-3xl text-[#16816e]">
                ✳
              </div>

              <h2 className="mt-6 text-2xl font-semibold">
                Your travel stories start here.
              </h2>

              <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#69756c]">
                You haven't saved a trip yet. Generate your travel
                options and save the complete trip to find it here later.
              </p>

              <Link
                href="/#start-planning"
                className="mt-7 inline-flex rounded-full bg-[#203e32] px-6 py-3 text-sm font-semibold text-white hover:bg-[#176f60]"
              >
                Plan your first trip ↗
              </Link>
            </div>
          ) : (
            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {trips.map((trip) => {
                const brief = trip.tripBrief || {};
                const dates = brief.dates || {};
                const travellers = brief.travellers || {};
                const budget = brief.budget || {};

                return (
                  <article
                    key={trip.id}
                    className="overflow-hidden rounded-[26px] border border-[#e5e8df] bg-white shadow-[0_8px_35px_rgba(32,53,43,0.05)]"
                  >
                    <div className="relative h-40 overflow-hidden bg-gradient-to-br from-[#315846] to-[#8ba98a] p-6 text-white">
                      <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">
                        SAVED JOURNEY
                      </span>

                      <h2 className="mt-4 line-clamp-2 text-2xl font-semibold">
                        {trip.destination ||
                          brief.destination ||
                          "Your destination"}
                      </h2>

                      <p className="mt-2 text-sm text-white/80">
                        {trip.origin || brief.origin || "Starting location not set"}
                        {" → "}
                        {trip.destination || brief.destination}
                      </p>
                    </div>

                    <div className="p-6">
                      <div className="flex flex-wrap gap-2 text-xs text-[#607064]">
                        <span className="rounded-full bg-[#f1f4ed] px-3 py-1.5">
                          {dates.durationDays || trip.durationDays || "—"} days
                        </span>

                        <span className="rounded-full bg-[#f1f4ed] px-3 py-1.5">
                          {travellers.total || trip.travellerCount || "—"} travellers
                        </span>

                        <span className="rounded-full bg-[#f1f4ed] px-3 py-1.5">
                          {trip.planIds?.length || 3} plans
                        </span>
                      </div>

                      <p className="mt-5 text-sm font-semibold text-[#294535]">
                        {formatDate(dates.departureDate || trip.departureDate)}
                        {" – "}
                        {formatDate(dates.returnDate || trip.returnDate)}
                      </p>

                      <p className="mt-2 text-sm text-[#69756c]">
                        Group budget:{" "}
                        {formatCurrency(
                          budget.totalGroupBudget ?? trip.budgetAmount,
                          budget.currency ||
                            trip.budgetCurrency ||
                            "INR"
                        )}
                      </p>

                      <div className="mt-6 flex gap-3">
                        <Link
                          href={`/trips/${trip.id}`}
                          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-[#203e32] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#176f60]"
                        >
                          View trip →
                        </Link>

                        <button
                          type="button"
                          onClick={() => handleDelete(trip.id)}
                          disabled={deletingId === trip.id}
                          className="inline-flex min-h-11 items-center justify-center rounded-full border border-red-200 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingId === trip.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </>
  );
}