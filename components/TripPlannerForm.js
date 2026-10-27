import { useState } from "react";
import { motion } from "motion/react";
import CityAutocomplete from "./CityAutocomplete";

const INTERESTS = [
  "Beaches",
  "Mountains",
  "Adventure",
  "Local food",
  "Culture",
  "Nightlife",
  "Nature",
  "Relaxation",
  "Shopping",
  "History",
  "Wildlife",
  "Photography",
];

const TRAVEL_STYLES = ["Relaxed", "Balanced", "Packed itinerary"];

const TRANSPORT_OPTIONS = [
  "Any suitable option",
  "Flight",
  "Train",
  "Bus",
  "Car / Self-drive",
];

function getLocalDateISO(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function shiftISODate(dateString, days) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + days);
  return getLocalDateISO(date);
}

function calculateNights(departureDate, returnDate) {
  const start = new Date(`${departureDate}T12:00:00`);
  const end = new Date(`${returnDate}T12:00:00`);

  return Math.round((end - start) / (1000 * 60 * 60 * 24));
}

function FieldLabel({ children, required = false }) {
  return (
    <label className="mb-2 block text-sm font-semibold text-slate-700">
      {children}
      {required && <span className="ml-1 text-rose-500">*</span>}
    </label>
  );
}

function SectionHeading({ number, title, description }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-sm font-bold text-emerald-700">
        {number}
      </span>

      <div>
        <h3 className="text-lg font-bold tracking-tight text-slate-900">
          {title}
        </h3>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";

export default function TripPlannerForm({ onPlansGenerated }) {
  const today = getLocalDateISO();
  const initialDeparture = shiftISODate(today, 7);
  const initialReturn = shiftISODate(today, 10);

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");

  const [departureDate, setDepartureDate] = useState(initialDeparture);
  const [returnDate, setReturnDate] = useState(initialReturn);

  const [travellers, setTravellers] = useState("2");
  const [groupType, setGroupType] = useState("Friends");
  const [groupDetails, setGroupDetails] = useState("");

  const [adults, setAdults] = useState("");
  const [children, setChildren] = useState("");
  const [childrenAges, setChildrenAges] = useState("");

  const [budget, setBudget] = useState("25000");
  const [currency, setCurrency] = useState("INR");

  const [budgetIncludesIntercity, setBudgetIncludesIntercity] =
    useState(true);

  const [selectedInterests, setSelectedInterests] = useState([
    "Beaches",
    "Local food",
  ]);

  const [travelStyle, setTravelStyle] = useState("Balanced");
  const [transport, setTransport] = useState("Any suitable option");

  const [additionalRequirements, setAdditionalRequirements] = useState("");

  const [notice, setNotice] = useState({
    type: "",
    message: "",
  });

  const [isGenerating, setIsGenerating] = useState(false);

  const totalTravellers = Number(travellers);
  const nights = calculateNights(departureDate, returnDate);
  const durationDays = nights + 1;

  function toggleInterest(interest) {
    setSelectedInterests((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest]
    );
  }

  function validateForm() {
    if (!origin.trim() || !destination.trim()) {
      return "Please select both your starting city and destination.";
    }

    if (
      origin.trim().toLowerCase() ===
      destination.trim().toLowerCase()
    ) {
      return "Your starting city and destination must be different.";
    }

    if (!departureDate || !returnDate) {
      return "Please select your departure and return dates.";
    }

    if (departureDate < today) {
      return "Departure date cannot be in the past.";
    }

    if (returnDate <= departureDate) {
      return "Return date must be after your departure date.";
    }

    if (
      !Number.isInteger(totalTravellers) ||
      totalTravellers < 1 ||
      totalTravellers > 50
    ) {
      return "Please enter a valid traveller count between 1 and 50.";
    }

    const totalBudget = Number(budget);

    if (!Number.isFinite(totalBudget) || totalBudget <= 0) {
      return "Please enter a valid total trip budget.";
    }

    const adultsEntered = adults.trim() !== "";
    const childrenEntered = children.trim() !== "";

    if (adultsEntered !== childrenEntered) {
      return "Enter both adult and child counts, or leave both blank.";
    }

    if (adultsEntered && childrenEntered) {
      const adultCount = Number(adults);
      const childCount = Number(children);

      if (
        !Number.isInteger(adultCount) ||
        !Number.isInteger(childCount) ||
        adultCount < 0 ||
        childCount < 0 ||
        adultCount + childCount !== totalTravellers
      ) {
        return "Adults and children must add up to the total travellers.";
      }

      if (adultCount < 1) {
        return "At least one adult is required when specifying children.";
      }
    }

    if (selectedInterests.length === 0) {
      return "Please select at least one travel interest.";
    }

    return "";
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isGenerating) return;

    const validationMessage = validateForm();

    if (validationMessage) {
      setNotice({
        type: "error",
        message: validationMessage,
      });
      return;
    }

    setIsGenerating(true);

    setNotice({
      type: "loading",
      message: "Building your personalised travel plans...",
    });

    const adultCount =
      adults.trim() === "" ? null : Number(adults);

    const childCount =
      children.trim() === "" ? null : Number(children);

    const totalBudget = Number(budget);

    const tripBrief = {
      origin: origin.trim(),
      destination: destination.trim(),

      dates: {
        departureDate,
        returnDate,
        nights,
        durationDays,
      },

      travellers: {
        total: totalTravellers,
        groupType,
        groupDetails: groupDetails.trim(),
        adults: adultCount,
        children: childCount,
        childrenAges: childrenAges.trim(),
      },

      budget: {
        amount: totalBudget,
        currency,
        scope: "total",
        totalGroupBudget: totalBudget,
        includesIntercityTransport: budgetIncludesIntercity,
      },

      preferences: {
        interests: selectedInterests,
        travelStyle,
        transport,
        additionalRequirements: additionalRequirements.trim(),
      },

      createdAt: new Date().toISOString(),
    };

    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          "triply-trip-brief",
          JSON.stringify(tripBrief)
        );
      }

      const response = await fetch("/api/trips/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tripBrief),
      });

      let result;

      try {
        result = await response.json();
      } catch {
        throw new Error(
          "The server returned an invalid response. Please try again."
        );
      }

      if (!response.ok) {
        let detailMessage =
          result?.error || "Unable to generate trip plans.";

        if (
          Array.isArray(result?.details) &&
          result.details.length > 0
        ) {
          detailMessage = result.details
            .map((item) =>
              typeof item === "string"
                ? item
                : item.message ||
                  item.path?.join(".") ||
                  "Invalid input"
            )
            .join(" ");
        }

        throw new Error(detailMessage);
      }

      if (
        !Array.isArray(result?.plans) ||
        result.plans.length === 0
      ) {
        throw new Error(
          "No travel plans were returned. Please try again."
        );
      }

      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          "triply-trip-plans",
          JSON.stringify(result.plans)
        );
      }

      setNotice({
        type: "success",
        message: `${result.plans.length} personalised travel plans are ready.`,
      });

      onPlansGenerated?.(result.plans, tripBrief);
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error?.message ||
          "Something went wrong while generating your trip plans.",
      });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section
      id="start-planning"
      className="scroll-mt-24 bg-slate-50 px-4 py-16 sm:px-6 lg:px-8 lg:py-24"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Your next adventure starts here
          </span>

          <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
            Let&apos;s plan your
            <span className="block text-emerald-600">
              perfect getaway.
            </span>
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
            Tell us what you have in mind. Triply will create personalised
            itineraries that balance your interests, travel dates and budget.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_80px_-32px_rgba(15,23,42,0.22)]"
        >
          {/* SECTION 1: DESTINATION AND DATES */}

          <div className="border-b border-slate-100 px-5 py-6 sm:px-8 sm:py-8">
            <SectionHeading
              number="01"
              title="Where are you headed?"
              description="Choose your starting point, destination and travel dates."
            />

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <FieldLabel required>Starting city</FieldLabel>

                <CityAutocomplete
                  label=""
                  icon="📍"
                  value={origin}
                  onChange={setOrigin}
                  placeholder="Where are you travelling from?"
                  maxLength={100}
                  required
                />
              </div>

              <div>
                <FieldLabel required>Destination</FieldLabel>

                <CityAutocomplete
                  label=""
                  icon="✈️"
                  value={destination}
                  onChange={setDestination}
                  placeholder="Where do you want to go?"
                  maxLength={100}
                  required
                />
              </div>

              <div>
                <FieldLabel required>Departure date</FieldLabel>

                <input
                  className={inputClass}
                  type="date"
                  value={departureDate}
                  min={today}
                  onChange={(event) => {
                    const nextDeparture = event.target.value;
                    setDepartureDate(nextDeparture);

                    if (
                      nextDeparture &&
                      returnDate <= nextDeparture
                    ) {
                      setReturnDate(
                        shiftISODate(nextDeparture, 1)
                      );
                    }
                  }}
                  required
                />
              </div>

              <div>
                <FieldLabel required>Return date</FieldLabel>

                <input
                  className={inputClass}
                  type="date"
                  value={returnDate}
                  min={shiftISODate(departureDate || today, 1)}
                  onChange={(event) =>
                    setReturnDate(event.target.value)
                  }
                  required
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="rounded-full bg-slate-100 px-3 py-1.5">
                {Math.max(0, nights)} nights
              </span>

              <span className="rounded-full bg-slate-100 px-3 py-1.5">
                {Math.max(0, durationDays)} days
              </span>
            </div>
          </div>

          {/* SECTION 2: TRAVELLERS */}

          <div className="border-b border-slate-100 px-5 py-6 sm:px-8 sm:py-8">
            <SectionHeading
              number="02"
              title="Who is travelling?"
              description="Help us tailor the pace and experiences for your group."
            />

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <FieldLabel required>Total travellers</FieldLabel>

                <input
                  className={inputClass}
                  type="number"
                  min="1"
                  max="50"
                  value={travellers}
                  onChange={(event) =>
                    setTravellers(event.target.value)
                  }
                  placeholder="Number of people"
                  required
                />
              </div>

              <div>
                <FieldLabel>Travelling with</FieldLabel>

                <select
                  className={inputClass}
                  value={groupType}
                  onChange={(event) =>
                    setGroupType(event.target.value)
                  }
                >
                  <option>Solo</option>
                  <option>Couple</option>
                  <option>Friends</option>
                  <option>Family</option>
                  <option>Business</option>
                </select>
              </div>

              <div>
                <FieldLabel>Number of adults (optional)</FieldLabel>

                <input
                  className={inputClass}
                  type="number"
                  min="1"
                  max="50"
                  value={adults}
                  onChange={(event) => setAdults(event.target.value)}
                  placeholder="e.g. 2"
                />
              </div>

              <div>
                <FieldLabel>Number of children (optional)</FieldLabel>

                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  max="49"
                  value={children}
                  onChange={(event) => setChildren(event.target.value)}
                  placeholder="e.g. 1"
                />
              </div>

              {children.trim() !== "" && Number(children) > 0 && (
                <div className="md:col-span-2">
                  <FieldLabel>Children&apos;s ages</FieldLabel>

                  <input
                    className={inputClass}
                    value={childrenAges}
                    onChange={(event) =>
                      setChildrenAges(event.target.value)
                    }
                    placeholder="e.g. 5, 8"
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    Separate ages with commas so activities can be age-appropriate.
                  </p>
                </div>
              )}

              <div className="md:col-span-2">
                <FieldLabel>
                  Anything else about your group?
                </FieldLabel>

                <textarea
                  className={`${inputClass} min-h-24 resize-y`}
                  value={groupDetails}
                  onChange={(event) =>
                    setGroupDetails(event.target.value)
                  }
                  maxLength={500}
                  placeholder="e.g. We prefer scenic drives and quieter places..."
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: BUDGET */}

          <div className="border-b border-slate-100 px-5 py-6 sm:px-8 sm:py-8">
            <SectionHeading
              number="03"
              title="Set your budget"
              description="Your budget helps us recommend realistic options for the whole group."
            />

            <div className="grid gap-5 md:grid-cols-[1fr_180px]">
              <div>
                <FieldLabel required>Total trip budget</FieldLabel>

                <input
                  className={inputClass}
                  type="number"
                  min="1"
                  step="any"
                  value={budget}
                  onChange={(event) =>
                    setBudget(event.target.value)
                  }
                  placeholder="Enter your total budget"
                  required
                />

                <p className="mt-2 text-xs text-slate-500">
                  This is the budget for the entire group, not per person.
                </p>
              </div>

              <div>
                <FieldLabel>Currency</FieldLabel>

                <select
                  className={inputClass}
                  value={currency}
                  onChange={(event) =>
                    setCurrency(event.target.value)
                  }
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="AED">AED</option>
                </select>
              </div>
            </div>

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-emerald-200">
              <input
                type="checkbox"
                checked={budgetIncludesIntercity}
                onChange={(event) =>
                  setBudgetIncludesIntercity(event.target.checked)
                }
                className="mt-1 h-4 w-4 accent-emerald-600"
              />

              <span>
                <span className="block text-sm font-semibold text-slate-800">
                  Include travel to and from the destination
                </span>

                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  Consider intercity transport within the overall budget.
                </span>
              </span>
            </label>
          </div>

          {/* SECTION 4: TRAVEL PREFERENCES */}

          <div className="border-b border-slate-100 px-5 py-6 sm:px-8 sm:py-8">
            <SectionHeading
              number="04"
              title="Design your experience"
              description="Select the experiences and travel style that suit you."
            />

            <FieldLabel required>
              What are you interested in?
            </FieldLabel>

            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((interest) => {
                const selected =
                  selectedInterests.includes(interest);

                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    aria-pressed={selected}
                    className={`rounded-full border px-4 py-2.5 text-sm font-medium transition ${
                      selected
                        ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
                    }`}
                  >
                    {selected && (
                      <span className="mr-1.5">✓</span>
                    )}
                    {interest}
                  </button>
                );
              })}
            </div>

            <div className="mt-7 grid gap-5 md:grid-cols-2">
              <div>
                <FieldLabel>Travel pace</FieldLabel>

                <select
                  className={inputClass}
                  value={travelStyle}
                  onChange={(event) =>
                    setTravelStyle(event.target.value)
                  }
                >
                  {TRAVEL_STYLES.map((style) => (
                    <option key={style} value={style}>
                      {style}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <FieldLabel>Preferred transport</FieldLabel>

                <select
                  className={inputClass}
                  value={transport}
                  onChange={(event) =>
                    setTransport(event.target.value)
                  }
                >
                  {TRANSPORT_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <FieldLabel>Special requests (optional)</FieldLabel>

                <textarea
                  className={`${inputClass} min-h-28 resize-y`}
                  value={additionalRequirements}
                  onChange={(event) =>
                    setAdditionalRequirements(event.target.value)
                  }
                  maxLength={1500}
                  placeholder="e.g. Prefer boutique hotels, avoid long treks, include local food spots..."
                />
              </div>
            </div>
          </div>

          {/* SUBMIT */}

          <div className="bg-slate-50 px-5 py-6 sm:px-8 sm:py-8">
            {notice.message && (
              <div
                role="status"
                aria-live="polite"
                className={`mb-5 rounded-2xl border px-4 py-3 text-sm leading-6 ${
                  notice.type === "error"
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : notice.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-sky-200 bg-sky-50 text-sky-800"
                }`}
              >
                {notice.message}
              </div>
            )}

            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <p className="max-w-sm text-xs leading-5 text-slate-500">
                Your plans are generated from your trip details,
                preferences and budget. Review estimates before making bookings.
              </p>

              <motion.button
                whileHover={isGenerating ? undefined : { y: -2 }}
                whileTap={isGenerating ? undefined : { scale: 0.98 }}
                type="submit"
                disabled={isGenerating}
                className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-600 px-7 py-4 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
              >
                {isGenerating ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Creating your plans...
                  </>
                ) : (
                  <>
                    Generate my trip plans
                    <span aria-hidden="true">↗</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}