import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";

import TripPlanResults from "../../components/TripPlanResults";
import TripPlanDetails from "../../components/TripPlanDetails";

import {
  auth,
  firebaseConfigured,
} from "../../lib/firebase";

import { getSavedTrip } from "../../lib/savedTrips";

export default function SavedTripPage() {
  const router = useRouter();
  const { tripId } = router.query;

  const [trip, setTrip] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!router.isReady || !tripId) {
      return undefined;
    }

    if (!firebaseConfigured || !auth) {
      setError("Firebase is not configured. Please check your setup.");
      setLoading(false);
      return undefined;
    }

    let active = true;

    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (!active) return;

        if (!user) {
          setError("Please sign in to view this saved trip.");
          setLoading(false);
          return;
        }

        setLoading(true);
        setError("");

        try {
          const savedTrip = await getSavedTrip(
            user.uid,
            String(tripId)
          );

          if (!active) return;

          if (!savedTrip) {
            setError("This saved trip could not be found.");
          } else if (!savedTrip.plans.length) {
            setError("This trip does not contain any saved plan options.");
          } else {
            setTrip(savedTrip);
          }
        } catch (loadError) {
          console.error("Unable to open saved trip:", loadError);

          if (active) {
            setError(
              "We couldn't open this trip. It may have been deleted, or your account may not have access to it."
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
  }, [router.isReady, tripId]);

  const tripBrief = trip?.tripBrief || {};

  const currency =
    tripBrief.budget?.currency ||
    trip?.budgetCurrency ||
    "INR";

  return (
    <>
      <Head>
        <title>
          {trip?.destination
            ? `${trip.destination} | Triply`
            : "Saved Trip | Triply"}
        </title>

        <meta
          name="description"
          content="View your saved Triply itinerary and compare all three travel plans."
        />
      </Head>

      <main className="min-h-screen bg-[#f8f8f2]">
        <header className="border-b border-[#e5e8df] bg-white/85">
          <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8">
            <Link
              href="/"
              className="text-2xl font-semibold tracking-tight text-[#243c30]"
            >
              triply<span className="text-[#16816e]">.</span>
            </Link>

            <Link
              href="/my-trips"
              className="rounded-full border border-[#dce3d9] px-4 py-2 text-sm font-semibold text-[#315342] hover:border-[#176f60]"
            >
              ← My saved trips
            </Link>
          </div>
        </header>

        {loading ? (
          <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-5 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#dce9df] border-t-[#16816e]" />

            <p className="mt-4 text-sm text-[#69756c]">
              Opening your saved journey...
            </p>
          </div>
        ) : error ? (
          <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-5 text-center">
            <h1 className="text-2xl font-semibold text-[#243c30]">
              Unable to open this trip
            </h1>

            <p className="mt-3 text-sm leading-7 text-[#69756c]">
              {error}
            </p>

            <Link
              href="/my-trips"
              className="mt-6 rounded-full bg-[#203e32] px-6 py-3 text-sm font-semibold text-white hover:bg-[#176f60]"
            >
              Back to My Trips
            </Link>
          </div>
        ) : trip ? (
          <>
            <section className="mx-auto max-w-7xl px-4 pb-3 pt-10 sm:px-8">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#16816e]">
                YOUR SAVED JOURNEY
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#243c30] sm:text-4xl">
                {trip.destination || tripBrief.destination}
              </h1>

              <p className="mt-3 text-sm text-[#69756c]">
                {trip.origin || tripBrief.origin}
                {" → "}
                {trip.destination || tripBrief.destination}
              </p>
            </section>

            <TripPlanResults
              plans={trip.plans}
              tripBrief={tripBrief}
              currency={currency}
              onOpenPlan={setSelectedPlan}
            />
          </>
        ) : null}
      </main>

      {selectedPlan && (
        <TripPlanDetails
          plan={selectedPlan}
          tripBrief={tripBrief}
          onBack={() => setSelectedPlan(null)}
        />
      )}
    </>
  );
}