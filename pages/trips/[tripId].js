import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";

import TripPlanResults from "../../components/TripPlanResults";
import TripPlanDetails from "../../components/TripPlanDetails";
import TripAssistant from "../../components/TripAssistant";

import {
  auth,
  firebaseConfigured,
} from "../../lib/firebase";

import { getSavedTrip } from "../../lib/savedTrips";

function formatDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function SavedTripPage() {
  const router = useRouter();
  const { tripId } = router.query;

  const [trip, setTrip] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantPlanId, setAssistantPlanId] = useState("");
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

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!active) return;

      if (!user) {
        setError("Please sign in to view this saved trip.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const savedTrip = await getSavedTrip(user.uid, String(tripId));

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
        if (active) setLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [router.isReady, tripId]);

  function openAssistant(plan = null) {
    setAssistantPlanId(plan?.id || "");
    setAssistantOpen(true);
  }

  const tripBrief = trip?.tripBrief || {};
  const currency = tripBrief.budget?.currency || trip?.budgetCurrency || "INR";
  const departureDate = tripBrief.dates?.departureDate || trip?.departureDate;
  const returnDate = tripBrief.dates?.returnDate || trip?.returnDate;
  const travellerCount = tripBrief.travellers?.total || trip?.travellerCount;

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
          content="Explore your saved itinerary and chat with your personal Triply travel companion."
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
              className="rounded-full border border-[#dce3d9] px-4 py-2 text-sm font-semibold text-[#315342] transition hover:border-[#176f60]"
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
            <p className="mt-3 text-sm leading-7 text-[#69756c]">{error}</p>
            <Link
              href="/my-trips"
              className="mt-6 rounded-full bg-[#203e32] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#176f60]"
            >
              Back to My Trips
            </Link>
          </div>
        ) : trip ? (
          <>
            <section className="mx-auto max-w-7xl px-4 pb-3 pt-10 sm:px-8">
              <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
                <div>
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
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-[#617066]">
                    {(departureDate || returnDate) && (
                      <span className="rounded-full border border-[#e1e5dc] bg-white px-3.5 py-2">
                        {formatDate(departureDate)}
                        {returnDate ? ` – ${formatDate(returnDate)}` : ""}
                      </span>
                    )}
                    {travellerCount && (
                      <span className="rounded-full border border-[#e1e5dc] bg-white px-3.5 py-2">
                        {travellerCount} travellers
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openAssistant()}
                  className="inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-full bg-[#203e32] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#176f60] md:self-auto"
                >
                  <span aria-hidden="true">✦</span>
                  Ask your Triply Assistant
                </button>
              </div>

              <div className="mt-7 rounded-2xl border border-[#dfe8dc] bg-[#eef4e9] px-5 py-4 sm:flex sm:items-center sm:justify-between sm:gap-5">
                <div>
                  <p className="text-sm font-semibold text-[#294735]">
                    Your trip has its own travel companion.
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#657568]">
                    Ask about itinerary dates, entry fees, stays in a specific area, local experiences or your trip budget.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openAssistant()}
                  className="mt-3 shrink-0 text-sm font-bold text-[#176f60] underline decoration-[#a9c6ad] underline-offset-4 transition hover:text-[#104f45] sm:mt-0"
                >
                  Start a conversation ↗
                </button>
              </div>
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
          onAskAI={openAssistant}
        />
      )}

      {assistantOpen && trip && (
        <TripAssistant
          tripId={trip.id}
          tripBrief={tripBrief}
          plans={trip.plans}
          initialPlanId={assistantPlanId}
          onClose={() => setAssistantOpen(false)}
        />
      )}
    </>
  );
}