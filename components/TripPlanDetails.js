
import { useEffect } from "react";
import { motion } from "motion/react";

const planImages = {
  "budget-explorer":
    "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1600&q=85",
  "balanced-escape":
    "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=1600&q=85",
  "premium-experience":
    "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1600&q=85",
};

function formatCurrency(amount, currency = "INR") {
  const value = Number(amount ?? 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatLabel(value) {
  return String(value)
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (character) => character.toUpperCase());
}

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

export default function TripPlanDetails({
  plan,
  tripBrief,
  onBack,
  onAskAI,
}) {
  useEffect(() => {
    if (!plan) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") onBack?.();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [plan, onBack]);

  if (!plan) return null;

  const trip = tripBrief?.trip || tripBrief || {};
  const dates = trip.dates || {};
  const travellers = trip.travellers || {};
  const currency = plan.estimatedCost?.currency || trip.currency || "INR";
  const total = Number(plan.estimatedCost?.total ?? 0);
  const breakdown = plan.estimatedCost?.breakdown || {};
  const days = Array.isArray(plan.days) ? plan.days : [];

  const image =
    planImages[plan.id] || planImages["balanced-escape"];

  const destination =
    trip.destination || "Your destination";

  const origin = trip.origin || "";

  return (
    <motion.div
      className="fixed inset-0 z-[100] overflow-y-auto bg-[#f8f8f2]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label={`${plan.name || "Trip"} details`}
    >
      <div className="min-h-screen">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#e5e8df] bg-[#f8f8f2]/95 px-4 py-3 backdrop-blur-xl sm:px-8">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-[#345342] transition hover:bg-[#e9eee5]"
          >
            <span aria-hidden="true">←</span>
            <span>All plans</span>
          </button>

          <span className="text-xl font-semibold tracking-tight text-[#244233]">
            triply<span className="text-[#16816e]">.</span>
          </span>

          <span className="hidden text-xs font-medium text-[#728075] sm:block">
            YOUR NEXT GETAWAY
          </span>
        </header>

        <main className="mx-auto max-w-7xl px-4 pb-16 sm:px-8">
          <section className="relative mt-5 h-[360px] overflow-hidden rounded-[28px] sm:mt-8 sm:h-[470px] lg:h-[530px]">
            <img
              src={image}
              alt={`${destination} travel destination`}
              className="absolute inset-0 h-full w-full object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-[#102d26]/90 via-[#102d26]/25 to-black/10" />

            <div className="absolute left-5 top-5 sm:left-8 sm:top-8">
              <span className="rounded-full border border-white/30 bg-white/15 px-4 py-2 text-[10px] font-bold tracking-[0.17em] text-white backdrop-blur-md">
                OPTION · {plan.name?.toUpperCase()}
              </span>
            </div>

            <div className="absolute inset-x-5 bottom-6 text-white sm:inset-x-9 sm:bottom-10 lg:inset-x-12">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/75">
                YOUR PERSONAL TRAVEL ITINERARY
              </p>

              <h1 className="max-w-4xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
                {destination}
              </h1>

              {plan.tagline && (
                <p className="mt-3 max-w-2xl text-base text-white/85 sm:text-lg">
                  {plan.tagline}
                </p>
              )}

              <div className="mt-6 flex flex-wrap gap-2">
                {origin && (
                  <span className="rounded-full bg-white/15 px-4 py-2 text-sm text-white backdrop-blur">
                    {origin} → {destination}
                  </span>
                )}

                {dates.departureDate && (
                  <span className="rounded-full bg-white/15 px-4 py-2 text-sm text-white backdrop-blur">
                    {formatDate(dates.departureDate)}
                    {dates.returnDate &&
                      ` – ${formatDate(dates.returnDate)}`}
                  </span>
                )}

                {travellers.total != null && (
                  <span className="rounded-full bg-white/15 px-4 py-2 text-sm text-white backdrop-blur">
                    {travellers.total} travellers
                  </span>
                )}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 py-7 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#e5e8df] bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#748075]">
                Total estimated cost
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-[#284333]">
                {formatCurrency(total, currency)}
              </p>
              <p className="mt-1 text-sm text-[#778077]">
                For your entire group
              </p>
            </div>

            <div className="rounded-2xl border border-[#e5e8df] bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#748075]">
                Your itinerary
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-[#284333]">
                {days.length} days
              </p>
              <p className="mt-1 text-sm text-[#778077]">
                {dates.nights ??
                  Math.max(days.length - 1, 0)}{" "}
                nights
              </p>
            </div>

            <div className="rounded-2xl border border-[#e5e8df] bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#748075]">
                Per person
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-[#284333]">
                {formatCurrency(
                  plan.estimatedCost?.perPerson ??
                    total / Math.max(Number(travellers.total || 1), 1),
                  currency
                )}
              </p>
              <p className="mt-1 text-sm text-[#778077]">
                Estimated share
              </p>
            </div>
          </section>

          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section>
              <div className="mb-7">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#16816e]">
                  THE EXPERIENCE
                </p>

                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#284333] sm:text-4xl">
                  Your days, thoughtfully planned.
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#69756c] sm:text-base">
                  {plan.summary ||
                    "A personalized travel experience for your group."}
                </p>
              </div>

              {days.length > 0 ? (
                <div className="space-y-5">
                  {days.map((day, index) => (
                    <article
                      key={`${plan.id || plan.name}-day-${day.day || index}`}
                      className="relative rounded-2xl border border-[#e5e8df] bg-white p-5 sm:p-7"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-[#eaf2e7] text-[#176f60]">
                          <span className="text-[9px] font-bold uppercase">
                            DAY
                          </span>
                          <span className="text-lg font-semibold leading-none">
                            {day.day || index + 1}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="text-xl font-semibold leading-snug text-[#284333]">
                            {day.title || `Day ${index + 1}`}
                          </h3>

                          {Number.isFinite(Number(day.estimatedCost)) &&
                            day.estimatedCost !== "" && (
                              <p className="mt-1 text-sm text-[#16816e]">
                                Estimated day cost:{" "}
                                {formatCurrency(day.estimatedCost, currency)}
                              </p>
                            )}
                        </div>
                      </div>

                      <div className="mt-6 space-y-4">
                        {[
                          ["Morning", day.morning, "☀"],
                          ["Afternoon", day.afternoon, "◷"],
                          ["Evening", day.evening, "☾"],
                        ].map(([label, activity, symbol]) =>
                          activity ? (
                            <div
                              key={label}
                              className="flex gap-3"
                            >
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#f5f6ef] text-sm text-[#56715e]">
                                {symbol}
                              </span>

                              <div>
                                <p className="text-sm font-semibold text-[#3a5142]">
                                  {label}
                                </p>
                                <p className="mt-1 text-sm leading-6 text-[#69756c]">
                                  {activity}
                                </p>
                              </div>
                            </div>
                          ) : null
                        )}
                      </div>

                      {day.localTip && (
                        <div className="mt-5 rounded-xl bg-[#f5f6ef] p-4">
                          <p className="text-xs font-bold uppercase tracking-wider text-[#54705b]">
                            Local tip
                          </p>
                          <p className="mt-1 text-sm leading-6 text-[#657267]">
                            {day.localTip}
                          </p>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl border border-[#e5e8df] bg-white p-6 text-sm text-[#69756c]">
                  No daily itinerary is available for this plan.
                </p>
              )}
            </section>

            <aside className="space-y-5 lg:sticky lg:top-24">
              <section className="rounded-2xl border border-[#e5e8df] bg-white p-5 sm:p-6">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#16816e]">
                  YOUR TRIP BUDGET
                </p>

                <h2 className="mt-2 text-2xl font-semibold text-[#284333]">
                  Cost breakdown
                </h2>

                <div className="mt-5 space-y-4">
                  {Object.entries(breakdown).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-start justify-between gap-3 text-sm"
                    >
                      <span className="text-[#69756c]">
                        {formatLabel(key)}
                      </span>
                      <strong className="whitespace-nowrap text-[#344d3c]">
                        {formatCurrency(value, currency)}
                      </strong>
                    </div>
                  ))}

                  <div className="flex items-center justify-between gap-3 border-t border-[#e5e8df] pt-4">
                    <strong className="text-[#284333]">Total</strong>
                    <strong className="text-lg text-[#176f60]">
                      {formatCurrency(total, currency)}
                    </strong>
                  </div>
                </div>

                <p className="mt-4 text-xs leading-5 text-[#788178]">
                  AI-generated estimates only. Actual prices may vary.
                </p>
              </section>

              <section className="rounded-2xl bg-[#203e32] p-5 text-white sm:p-6">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#b8d5c0]">
                  YOUR TRAVEL DETAILS
                </p>

                {plan.staySuggestion && (
                  <div className="mt-5">
                    <p className="text-xs text-white/60">Stay</p>
                    <p className="mt-1 text-sm leading-6">
                      {plan.staySuggestion}
                    </p>
                  </div>
                )}

                {plan.transportPlan && (
                  <div className="mt-4">
                    <p className="text-xs text-white/60">Transport</p>
                    <p className="mt-1 text-sm leading-6">
                      {plan.transportPlan}
                    </p>
                  </div>
                )}

                {plan.bestFor && (
                  <div className="mt-4">
                    <p className="text-xs text-white/60">Best for</p>
                    <p className="mt-1 text-sm leading-6">
                      {plan.bestFor}
                    </p>
                  </div>
                )}

                {typeof onAskAI === "function" && (
                  <button
                    type="button"
                    onClick={() => onAskAI(plan)}
                    className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-semibold text-[#203e32] transition hover:bg-[#eaf2e7]"
                  >
                    ✦ Ask AI about this trip
                  </button>
                )}
              </section>

              {plan.highlights?.length > 0 && (
                <section className="rounded-2xl border border-[#e5e8df] bg-white p-5">
                  <h3 className="font-semibold text-[#284333]">
                    Trip highlights
                  </h3>

                  <ul className="mt-4 space-y-3">
                    {plan.highlights.map((highlight, index) => (
                      <li
                        key={`${plan.id || plan.name}-detail-${index}`}
                        className="flex gap-2 text-sm leading-6 text-[#69756c]"
                      >
                        <span className="text-[#16816e]">✓</span>
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </aside>
          </div>

          <div className="mt-8 rounded-2xl border border-[#e5e8df] bg-white p-5 text-xs leading-6 text-[#69756c] sm:p-6">
            <strong className="text-[#405747]">
              Before you travel:
            </strong>{" "}
            This itinerary contains AI-generated suggestions and estimates.
            Verify train or flight schedules, accommodation rates,
            activity availability and local conditions before booking.
          </div>

          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#dce3d9] bg-white px-6 py-3 text-sm font-semibold text-[#315342] transition hover:border-[#176f60] hover:text-[#176f60]"
            >
              ← Back to all travel plans
            </button>
          </div>
        </main>
      </div>
    </motion.div>
  );
}
