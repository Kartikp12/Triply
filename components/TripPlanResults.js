
import TripPlanCard from "./TripPlanCard";

export default function TripPlanResults({
  plans = [],
  tripBrief,
  currency = "INR",
  onOpenPlan,
  onPlanAgain,
}) {
  if (!Array.isArray(plans) || plans.length === 0) {
    return null;
  }

  const destination =
    tripBrief?.destination ||
    tripBrief?.trip?.destination ||
    "your destination";

  const origin =
    tripBrief?.origin ||
    tripBrief?.trip?.origin ||
    "";

  const travellers =
    tripBrief?.travellers?.total ??
    tripBrief?.trip?.travellers?.total;

  const departureDate =
    tripBrief?.dates?.departureDate ||
    tripBrief?.trip?.dates?.departureDate;

  const returnDate =
    tripBrief?.dates?.returnDate ||
    tripBrief?.trip?.dates?.returnDate;

  function formatDate(date) {
    if (!date) return "";

    const parsed = new Date(`${date}T00:00:00`);

    if (Number.isNaN(parsed.getTime())) return "";

    return parsed.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <section
      id="trip-results"
      className="scroll-mt-24 bg-[#f8f8f2] px-4 py-12 sm:px-6 sm:py-16 lg:px-10"
      aria-live="polite"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col justify-between gap-5 sm:mb-10 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.17em] text-[#176f60]">
              <span className="h-2 w-2 rounded-full bg-[#176f60]" />
              MADE AROUND YOUR TRIP
            </div>

            <h2 className="text-3xl font-semibold tracking-tight text-[#243c30] sm:text-4xl lg:text-5xl">
              Three ways to{" "}
              <span className="font-serif italic text-[#18816e]">
                get away.
              </span>
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-6 text-[#6b756d] sm:text-base">
              Compare three AI-generated travel experiences and
              choose the one that feels right for you.
            </p>
          </div>

          {onPlanAgain && (
            <button
              type="button"
              onClick={onPlanAgain}
              className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-full border border-[#dce3d9] bg-white px-5 py-3 text-sm font-semibold text-[#315342] transition hover:border-[#176f60] hover:text-[#176f60] sm:self-auto"
            >
              + Plan another trip
            </button>
          )}
        </div>

        <div className="mb-8 flex flex-wrap items-center gap-2.5">
          {origin && (
            <span className="rounded-full border border-[#e1e5dc] bg-white px-4 py-2 text-sm text-[#536158]">
              <span className="mr-1 text-[#176f60]">↗</span>
              {origin} → {destination}
            </span>
          )}

          {departureDate && returnDate && (
            <span className="rounded-full border border-[#e1e5dc] bg-white px-4 py-2 text-sm text-[#536158]">
              {formatDate(departureDate)} – {formatDate(returnDate)}
            </span>
          )}

          {travellers != null && (
            <span className="rounded-full border border-[#e1e5dc] bg-white px-4 py-2 text-sm text-[#536158]">
              {travellers}{" "}
              {Number(travellers) === 1 ? "traveller" : "travellers"}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3 xl:gap-6">
          {plans.map((plan, index) => (
            <TripPlanCard
              key={plan.id || plan.name || index}
              plan={plan}
              index={index}
              currency={currency}
              onOpen={onOpenPlan}
            />
          ))}
        </div>

        <div className="mt-8 flex items-start gap-3 rounded-2xl border border-[#e4e7dd] bg-white/70 p-4 sm:p-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eaf2e7] text-[#176f60]">
            i
          </span>

          <p className="text-xs leading-5 text-[#69746d] sm:text-sm">
            Prices are AI-generated estimates, not live quotes.
            Confirm transport fares, accommodation prices,
            opening hours and availability before travelling.
          </p>
        </div>
      </div>
    </section>
  );
}
