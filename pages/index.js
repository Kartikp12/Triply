import Head from "next/head";
import { useState } from "react";
import { motion } from "motion/react";

import SiteHeader from "../components/SiteHeader";
import TripPlannerForm from "../components/TripPlannerForm";
import TripPlanResults from "../components/TripPlanResults";
import TripPlanDetails from "../components/TripPlanDetails";

const DESTINATIONS = [
  {
    name: "Bali, Indonesia",
    category: "Tropical escape",
    description: "Lush landscapes, beautiful beaches and slow mornings.",
    image:
      "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Swiss Alps",
    category: "Mountain retreat",
    description: "Alpine villages, scenic trains and breathtaking views.",
    image:
      "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Kyoto, Japan",
    category: "Culture & heritage",
    description: "Traditional streets, peaceful temples and local cuisine.",
    image:
      "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=900&q=85",
  },
];

const FEATURES = [
  {
    number: "01",
    title: "Tell us what you love",
    description:
      "Share your destination, travel dates, budget and the experiences you want.",
  },
  {
    number: "02",
    title: "Explore your possibilities",
    description:
      "Get multiple personalised travel plans designed around your preferences.",
  },
  {
    number: "03",
    title: "Make it your own",
    description:
      "Open a plan, explore the itinerary and decide which journey feels right.",
  },
];

export default function Home() {
  const [plans, setPlans] = useState([]);
  const [tripBrief, setTripBrief] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);

  function handlePlansGenerated(generatedPlans, brief) {
    setPlans(generatedPlans);
    setTripBrief(brief);
    setSelectedPlan(null);

    setTimeout(() => {
      document.getElementById("trip-results")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 150);
  }

  function handlePlanAgain() {
    setSelectedPlan(null);

    document.getElementById("start-planning")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <>
      <Head>
        <title>Triply — Your Journey, Thoughtfully Planned</title>
        <meta
          name="description"
          content="Discover personalised travel plans with Triply. Plan your next getaway around your budget, interests and travel style."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#f8fafc" />
      </Head>

      <div className="min-h-screen overflow-x-clip bg-white text-slate-900">
        <SiteHeader />

        {/* HERO */}

        <section className="relative isolate overflow-hidden bg-[#f7faf8]">
          <div className="pointer-events-none absolute -right-32 -top-20 h-96 w-96 rounded-full bg-emerald-200/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-amber-100/60 blur-3xl" />

          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:px-10 lg:py-24">
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65 }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white/80 px-4 py-2 text-xs font-bold tracking-wide text-emerald-800 shadow-sm">
                <span className="text-base">✦</span>
                YOUR NEXT CHAPTER STARTS HERE
              </div>

              <h1 className="mt-7 max-w-2xl text-5xl font-semibold leading-[1.08] tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
                Less planning.
                <br />
                <span className="font-serif italic text-emerald-700">
                  More living.
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
                Your time away should feel extraordinary, not overwhelming.
                Discover thoughtfully personalised journeys built around
                your budget, your people and your idea of a perfect trip.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() =>
                    document
                      .getElementById("start-planning")
                      ?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      })
                  }
                  className="inline-flex items-center justify-center gap-3 rounded-2xl bg-emerald-700 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-emerald-900/15 transition hover:-translate-y-0.5 hover:bg-emerald-800"
                >
                  Plan my getaway
                  <span aria-hidden="true">↗</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    document
                      .getElementById("discover")
                      ?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      })
                  }
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white/80 px-6 py-4 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-white"
                >
                  Explore destinations
                </button>
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-medium text-slate-500">
                <span className="flex items-center gap-2">
                  <span className="text-emerald-600">✓</span>
                  Personalised itineraries
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-emerald-600">✓</span>
                  Budget-conscious planning
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-emerald-600">✓</span>
                  Your travel style
                </span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.12 }}
              className="relative mx-auto w-full max-w-xl"
            >
              <div className="relative overflow-hidden rounded-[2rem] bg-slate-200 shadow-2xl shadow-slate-900/15">
                <img
                  src="https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1400&q=90"
                  alt="Colourful coastal village surrounded by the sea"
                  className="h-[400px] w-full object-cover sm:h-[500px]"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-slate-950/5" />

                <div className="absolute left-5 top-5 rounded-2xl border border-white/30 bg-white/85 px-4 py-3 shadow-lg backdrop-blur-md sm:left-7 sm:top-7">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Your next escape
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    Somewhere beautiful.
                  </p>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-6 text-white sm:p-8">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75">
                    A world waiting for you
                  </p>
                  <h2 className="mt-2 font-serif text-3xl italic sm:text-4xl">
                    Find your somewhere.
                  </h2>
                  <p className="mt-3 max-w-sm text-sm leading-6 text-white/85">
                    From spontaneous escapes to long-awaited adventures,
                    start with a feeling and let the journey unfold.
                  </p>
                </div>
              </div>

              <div className="absolute -bottom-5 -left-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-xl sm:-left-7 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-xl">
                    ✨
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Made around you
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Your interests. Your budget.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* DESTINATIONS */}

        <section
          id="discover"
          className="scroll-mt-20 px-5 py-20 sm:px-8 sm:py-24 lg:px-10"
        >
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">
                  A little inspiration
                </p>

                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  The world looks good on you.
                </h2>

                <p className="mt-3 max-w-xl text-sm leading-7 text-slate-500 sm:text-base">
                  A few places to spark your imagination. Your own destination
                  is waiting in the planner below.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("start-planning")
                    ?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    })
                }
                className="self-start text-sm font-bold text-emerald-700 transition hover:text-emerald-900 sm:self-auto"
              >
                Build your own trip ↗
              </button>
            </div>

            <div className="mt-9 grid gap-5 md:grid-cols-3">
              {DESTINATIONS.map((destination, index) => (
                <motion.article
                  key={destination.name}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.45, delay: index * 0.1 }}
                  className="group overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/10"
                >
                  <div className="relative overflow-hidden">
                    <img
                      src={destination.image}
                      alt={destination.name}
                      loading="lazy"
                      className="h-64 w-full object-cover transition duration-700 group-hover:scale-105"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />

                    <span className="absolute bottom-4 left-4 rounded-full border border-white/30 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-800 backdrop-blur">
                      {destination.category}
                    </span>
                  </div>

                  <div className="p-5">
                    <h3 className="text-xl font-bold text-slate-900">
                      {destination.name}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {destination.description}
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        const destinationInput =
                          document.querySelector(
                            "#start-planning input[placeholder='Where do you want to go?']"
                          );

                        document
                          .getElementById("start-planning")
                          ?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });

                        if (destinationInput) {
                          window.setTimeout(() => {
                            destinationInput.focus();
                          }, 450);
                        }
                      }}
                      className="mt-5 text-sm font-bold text-emerald-700 transition hover:text-emerald-900"
                    >
                      Plan a similar escape ↗
                    </button>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}

        <section
          id="how-it-works"
          className="scroll-mt-20 bg-[#f7faf8] px-5 py-20 sm:px-8 sm:py-24 lg:px-10"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">
                Thoughtful by design
              </p>

              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Your trip, without the overwhelm.
              </h2>

              <p className="mt-4 text-sm leading-7 text-slate-500 sm:text-base">
                Less time comparing endless tabs. More time imagining
                where you will go next.
              </p>
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {FEATURES.map((feature) => (
                <article
                  key={feature.number}
                  className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8"
                >
                  <span className="font-serif text-4xl italic text-emerald-700/50">
                    {feature.number}
                  </span>

                  <h3 className="mt-6 text-xl font-bold text-slate-900">
                    {feature.title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-slate-500">
                    {feature.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* TRIP PLANNER */}

        <TripPlannerForm onPlansGenerated={handlePlansGenerated} />

        {/* GENERATED TRIP PLANS */}

        {plans.length > 0 && (
          <section
            id="trip-results"
            className="scroll-mt-20 px-5 py-16 sm:px-8 sm:py-20 lg:px-10"
          >
            <TripPlanResults
              plans={plans}
              tripBrief={tripBrief}
              currency={tripBrief?.budget?.currency || "INR"}
              onOpenPlan={setSelectedPlan}
              onPlanAgain={handlePlanAgain}
            />
          </section>
        )}

        {/* CLOSING CTA */}

        <section className="px-5 pb-16 sm:px-8 sm:pb-20 lg:px-10">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-emerald-950 px-6 py-14 text-center sm:px-12 sm:py-20">
            <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-emerald-700/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-teal-500/20 blur-3xl" />

            <div className="relative mx-auto max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">
                Your next story awaits
              </p>

              <h2 className="mt-4 font-serif text-4xl italic leading-tight text-white sm:text-5xl">
                Somewhere out there,
                <br />
                it&apos;s already beautiful.
              </h2>

              <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-emerald-100/75 sm:text-base">
                Start with a destination, a date or simply the desire to
                get away. We&apos;ll help you shape the rest.
              </p>

              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("start-planning")
                    ?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    })
                }
                className="mt-8 inline-flex items-center gap-3 rounded-2xl bg-white px-6 py-4 text-sm font-bold text-emerald-950 transition hover:-translate-y-0.5 hover:bg-emerald-50"
              >
                Start planning
                <span aria-hidden="true">↗</span>
              </button>
            </div>
          </div>
        </section>

        {/* FOOTER */}

        <footer className="border-t border-slate-100 px-5 py-8 sm:px-8 lg:px-10">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <a
              href="#"
              className="inline-flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-700 text-sm text-white">
                T
              </span>
              triply
              <span className="text-emerald-700">.</span>
            </a>

            <p className="text-xs leading-6 text-slate-500">
              Thoughtful journeys begin with a better plan.
            </p>

            <p className="text-xs text-slate-400">
              © {new Date().getFullYear()} Triply
            </p>
          </div>
        </footer>
      </div>

      {/* FULL-SCREEN PLAN DETAILS */}

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