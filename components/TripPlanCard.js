
import { motion } from "motion/react";

function formatCurrency(amount, currency = "INR") {
  const value = Number(amount ?? 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

const planImages = {
  "budget-explorer":
    "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1000&q=85",
  "balanced-escape":
    "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=1000&q=85",
  "premium-experience":
    "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1000&q=85",
};

export default function TripPlanCard({
  plan,
  index = 0,
  onOpen,
  currency = "INR",
}) {
  if (!plan) return null;

  const total = Number(plan.estimatedCost?.total ?? 0);
  const planCurrency = plan.estimatedCost?.currency || currency;

  const budgetStatus = plan.budgetFit || "within-budget";

  const statusLabels = {
    "within-budget": "Within budget",
    "near-budget": "Close to budget limit",
    "over-budget": "Over budget",
  };

  const image =
    planImages[plan.id] || planImages["balanced-escape"];

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.45, delay: index * 0.1 }}
      whileHover={{ y: -6 }}
      className="group overflow-hidden rounded-[26px] border border-[#e6e8df] bg-white shadow-[0_8px_35px_rgba(32,53,43,0.06)] transition-shadow duration-300 hover:shadow-[0_18px_45px_rgba(32,53,43,0.13)]"
    >
      <button
        type="button"
        onClick={() => onOpen?.(plan)}
        className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167665] focus-visible:ring-inset"
        aria-label={`Explore ${plan.name || "travel"} plan`}
      >
        <div className="relative h-[230px] overflow-hidden sm:h-[250px]">
          <img
            src={image}
            alt={`${plan.name || "Travel plan"} destination`}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-[#102e27]/85 via-[#102e27]/10 to-transparent" />

          <span className="absolute left-4 top-4 rounded-full border border-white/30 bg-white/90 px-3 py-1.5 text-[10px] font-bold tracking-[0.14em] text-[#23483d] backdrop-blur">
            OPTION {String(index + 1).padStart(2, "0")}
          </span>

          <span
            className={`absolute right-4 top-4 rounded-full px-3 py-1.5 text-xs font-semibold ${
              budgetStatus === "over-budget"
                ? "bg-red-50 text-red-700"
                : "bg-[#f0f6e9] text-[#365b40]"
            }`}
          >
            {statusLabels[budgetStatus] || "Estimated cost"}
          </span>

          <div className="absolute bottom-5 left-5 right-5 text-white">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.17em] text-white/75">
              Your next getaway
            </p>

            <h3 className="text-2xl font-semibold tracking-tight sm:text-[28px]">
              {plan.name || "Your travel plan"}
            </h3>

            {plan.tagline && (
              <p className="mt-1 text-sm text-white/85">
                {plan.tagline}
              </p>
            )}
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <p className="line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-[#69746d]">
            {plan.summary ||
              "A personalized itinerary designed around your trip."}
          </p>

          <div className="mt-5 rounded-2xl bg-[#f5f6ef] p-4">
            <p className="text-[10px] font-bold tracking-[0.13em] text-[#727b70]">
              ESTIMATED TOTAL FOR GROUP
            </p>

            <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
              <strong className="text-3xl font-semibold tracking-tight text-[#263e31]">
                {formatCurrency(total, planCurrency)}
              </strong>

              <span className="text-xs text-[#727b70]">
                {plan.days?.length || 0} days
              </span>
            </div>

            <p className="mt-1 text-sm text-[#727b70]">
              {formatCurrency(
                plan.estimatedCost?.perPerson ??
                  total,
                planCurrency
              )}{" "}
              {plan.estimatedCost?.perPerson != null
                ? "per person"
                : "estimated"}
            </p>
          </div>

          {Array.isArray(plan.highlights) &&
            plan.highlights.length > 0 && (
              <div className="mt-5">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#435c4b]">
                  Trip highlights
                </p>

                <ul className="space-y-2.5">
                  {plan.highlights.slice(0, 3).map((item, i) => (
                    <li
                      key={`${plan.id || plan.name}-highlight-${i}`}
                      className="flex items-start gap-2.5 text-sm leading-5 text-[#536158]"
                    >
                      <span className="mt-0.5 text-[#16816e]">
                        ✓
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          <div className="mt-6 flex items-center justify-between border-t border-[#e9ece5] pt-4">
            <span className="text-sm font-semibold text-[#176f60]">
              Explore this trip
            </span>

            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#176f60] text-white transition-transform duration-300 group-hover:translate-x-1">
              ↗
            </span>
          </div>
        </div>
      </button>
    </motion.article>
  );
}
