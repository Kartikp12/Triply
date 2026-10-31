import { z } from "zod";

const MODEL = "@cf/zai-org/glm-4.7-flash";

const MAX_CHUNK_DAYS = 4;
const MAX_CHUNK_ATTEMPTS = 3;
const MAX_ATTRACTION_REPAIR_ATTEMPTS = 5;

const PLAN_IDS = [
  "budget-explorer",
  "balanced-escape",
  "premium-experience",
];

// --------------------------------------------------
// SCHEMAS
// --------------------------------------------------

const TripBriefSchema = z.object({
  origin: z.string().trim().min(1).max(120),
  destination: z.string().trim().min(1).max(160),

  dates: z.object({
    departureDate: z.iso.date(),
    returnDate: z.iso.date(),
    nights: z.number().int().positive(),
    durationDays: z.number().int().positive(),
  }),

  travellers: z.object({
    total: z.number().int().min(1).max(50),
    groupType: z.string().trim().min(1).max(80),
    groupDetails: z.string().max(250).optional().default(""),
    adults: z.number().int().min(0).nullable().optional(),
    children: z.number().int().min(0).nullable().optional(),
    childrenAges: z.string().max(100).optional().default(""),
  }),

  budget: z.object({
    amount: z.number().positive(),
    currency: z.enum(["INR", "USD", "EUR", "GBP"]),
    scope: z.literal("total"),
    totalGroupBudget: z.number().positive(),
    includesIntercityTransport: z.boolean(),
  }),

  preferences: z.object({
    interests: z.array(z.string().max(50)).max(20),
    travelStyle: z.string().trim().min(1).max(80),
    transport: z.string().trim().min(1).max(80),
    additionalRequirements: z.string().max(1500).optional().default(""),
  }),
});

const PlanOverviewSchema = z.object({
  id: z.enum(PLAN_IDS),
  name: z.string().min(1),
  tagline: z.string().min(1),
  summary: z.string().min(1),

  estimatedCost: z.object({
    total: z.number().nonnegative(),
    perPerson: z.number().nonnegative(),
    currency: z.enum(["INR", "USD", "EUR", "GBP"]),

    breakdown: z.object({
      intercityTransport: z.number().nonnegative(),
      accommodation: z.number().nonnegative(),
      food: z.number().nonnegative(),
      localTransport: z.number().nonnegative(),
      activities: z.number().nonnegative(),
      miscellaneous: z.number().nonnegative(),
    }),
  }),

  highlights: z.array(z.string().min(1)).min(3).max(6),
  staySuggestion: z.string().min(1),
  transportPlan: z.string().min(1),
  bestFor: z.string().min(1),
  chatbotContext: z.string().min(1),
});

const DaySchema = z.object({
  day: z.number().int().positive(),
  title: z.string().trim().min(1),
  morning: z.string().trim().min(1),
  afternoon: z.string().trim().min(1),
  evening: z.string().trim().min(1),

  // Empty attractions are permitted here.
  // We apply the final-day rule separately after cleaning.
  attractions: z.array(
    z.string().trim().min(2).max(120)
  ).max(8),

  estimatedCost: z.number().nonnegative(),
  localTip: z.string().trim().min(1),
});

const AttractionRepairSchema = z.object({
  attraction: z.string().trim().min(2).max(120),
  timeOfDay: z.enum(["morning", "afternoon", "evening"]),
  activityDescription: z.string().trim().min(1).max(1000),
});

// --------------------------------------------------
// RESPONSE HELPERS
// --------------------------------------------------

function sendError(res, status, error) {
  return res.status(status).json({
    success: false,
    error,
  });
}

function getValidationFeedback(issues) {
  return issues.map((issue) => {
    const field = issue.path.length
      ? issue.path.join(".")
      : "response";

    return `Field: ${field}. Problem: ${issue.message}`;
  });
}

// --------------------------------------------------
// JSON PARSING
// --------------------------------------------------

function parseModelJSON(text) {
  if (!text || typeof text !== "string") {
    throw new Error("The AI returned an empty response.");
  }

  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace <= firstBrace) {
      throw new Error("The AI did not return valid JSON.");
    }

    try {
      return JSON.parse(
        cleaned.slice(firstBrace, lastBrace + 1)
      );
    } catch {
      throw new Error("The AI did not return valid JSON.");
    }
  }
}

function extractModelText(data) {
  const result = data?.result;

  const candidates = [
    result?.response,
    result?.output_text,
    result?.choices?.[0]?.message?.content,
    result?.choices?.[0]?.text,
    result?.content,
  ];

  const output = candidates.find(
    (value) => typeof value === "string" && value.trim()
  );

  if (!output) {
    console.error(
      "Cloudflare returned no usable text. Result keys:",
      Object.keys(result ?? {})
    );

    throw new Error("The AI returned an empty response.");
  }

  return output;
}

// --------------------------------------------------
// PLAN STYLE
// --------------------------------------------------

function getPlanStyle(planId) {
  const styles = {
    "budget-explorer":
      "Prioritize economical transport, affordable accommodation, " +
      "low-cost attractions and practical savings.",

    "balanced-escape":
      "Balance comfort, memorable experiences and reasonable costs.",

    "premium-experience":
      "Prioritize comfort and distinctive experiences, while clearly " +
      "identifying when the total budget is insufficient.",
  };

  return styles[planId];
}

// --------------------------------------------------
// ATTRACTION NORMALIZATION
// --------------------------------------------------

function normalizeAttraction(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function areSameAttraction(first, second) {
  const a = normalizeAttraction(first);
  const b = normalizeAttraction(second);

  if (!a || !b) return false;

  // Exact normalized-name matching only.
  // Calangute Beach and Calangute Market are different places.
  return a === b;
}

// --------------------------------------------------
// TRANSPORT INFRASTRUCTURE FILTER
// --------------------------------------------------

function isTransportInfrastructure(value) {
  const name = normalizeAttraction(value);

  const patterns = [
    /\brailway station\b/,
    /\brail station\b/,
    /\brailroad station\b/,
    /\btrain station\b/,
    /\brailway junction\b/,
    /\brail junction\b/,
    /\bcentral station\b/,
    /\bairport\b/,
    /\binternational airport\b/,
    /\bdomestic airport\b/,
    /\bbus station\b/,
    /\bbus terminal\b/,
    /\bbus stand\b/,
    /\bbus depot\b/,
    /\bmetro station\b/,
    /\bsubway station\b/,
    /\btransit station\b/,
    /\btransit hub\b/,
    /\bferry terminal\b/,
    /\bferry station\b/,
  ];

  return patterns.some((pattern) => pattern.test(name));
}

function cleanAttractions(attractions = []) {
  const cleaned = [];
  const seen = new Set();

  for (const attraction of attractions) {
    const name = String(attraction ?? "").trim();
    const normalized = normalizeAttraction(name);

    if (!normalized) continue;

    if (isTransportInfrastructure(name)) {
      console.warn("Removed transport infrastructure:", name);
      continue;
    }

    if (seen.has(normalized)) continue;

    seen.add(normalized);
    cleaned.push(name);
  }

  return cleaned;
}

function cleanDay(day) {
  return {
    ...day,
    attractions: cleanAttractions(day.attractions),
  };
}

function cleanPreviousDays(days = []) {
  return days.map(cleanDay);
}

// --------------------------------------------------
// DUPLICATE DETECTION
// --------------------------------------------------

function findDuplicateAttractions(previousDays = [], candidateDays = []) {
  const seen = previousDays.flatMap((day) =>
    cleanAttractions(day.attractions ?? []).map((name) => ({
      name,
      day: day.day,
    }))
  );

  const duplicates = [];

  for (const day of candidateDays) {
    for (const name of cleanAttractions(day.attractions ?? [])) {
      const match = seen.find((item) =>
        areSameAttraction(item.name, name)
      );

      if (match) {
        duplicates.push({
          day: day.day,
          attraction: name,
          existingAttraction: match.name,
          previousDay: match.day,
        });
      } else {
        seen.push({
          name,
          day: day.day,
        });
      }
    }
  }

  return duplicates;
}

function getUsedAttractions(days = []) {
  return days.flatMap((day) =>
    cleanAttractions(day.attractions ?? [])
  );
}

function isAlreadyUsed(attraction, usedAttractions = []) {
  return usedAttractions.some((used) =>
    areSameAttraction(used, attraction)
  );
}

// --------------------------------------------------
// CLOUDFLARE AI
// --------------------------------------------------

async function callCloudflareAI(trip, prompt, maxTokens = 2500) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    throw new Error(
      "Cloudflare AI credentials are not configured."
    );
  }

  const endpoint =
    `https://api.cloudflare.com/client/v4/accounts/` +
    `${accountId}/ai/run/${MODEL}`;

  const startedAt = Date.now();

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content:
            "You are Triply, a precise travel-planning assistant. " +
            "Return valid JSON only, without Markdown. " +
            "Follow every requested JSON field exactly. " +
            "Never omit required fields. " +
            "Never invent confirmed bookings or live prices. " +
            "Use realistic estimates and complete all requested fields.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],

      response_format: {
        type: "json_object",
      },

      chat_template_kwargs: {
        enable_thinking: false,
      },

      reasoning_effort: "low",
      max_tokens: maxTokens,
      temperature: 0.1,
    }),

    signal: AbortSignal.timeout(75000),
  });

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      `Cloudflare returned an invalid response (${response.status}).`
    );
  }

  console.log("Triply Cloudflare response:", {
    status: response.status,
    elapsedMs: Date.now() - startedAt,
  });

  if (!response.ok || !data.success) {
    console.error(
      "Cloudflare AI request failed:",
      response.status,
      JSON.stringify(data.errors ?? data, null, 2)
    );

    throw new Error(
      `Cloudflare AI request failed with status ${response.status}.`
    );
  }

  return parseModelJSON(extractModelText(data));
}

// --------------------------------------------------
// OVERVIEW GENERATION
// --------------------------------------------------

async function generateOverview(trip, planId) {
  const prompt = `
Create the overview for exactly one travel plan.

TRIP:
${JSON.stringify(trip, null, 2)}

PLAN ID: ${planId}

PLAN STYLE:
${getPlanStyle(planId)}

The entire group's budget is ${trip.budget.totalGroupBudget}
${trip.budget.currency} for ${trip.travellers.total} travellers.

Return this JSON structure:

{
  "plan": {
    "id": "${planId}",
    "name": "Plan name",
    "tagline": "Short tagline",
    "summary": "Plan summary",
    "estimatedCost": {
      "total": 10000,
      "perPerson": 5000,
      "currency": "${trip.budget.currency}",
      "breakdown": {
        "intercityTransport": 0,
        "accommodation": 3000,
        "food": 2500,
        "localTransport": 1000,
        "activities": 2000,
        "miscellaneous": 1500
      }
    },
    "highlights": [
      "Highlight 1",
      "Highlight 2",
      "Highlight 3"
    ],
    "staySuggestion": "Accommodation guidance",
    "transportPlan": "Transport guidance",
    "bestFor": "Suitable travellers",
    "chatbotContext": "Plan details and assumptions"
  }
}

RULES:
- Return one complete plan, not three plans.
- Use the exact requested plan ID.
- Use the requested currency for all costs.
- The breakdown sum must represent the whole trip, not one day.
- If intercity transport is excluded, set its cost to zero.
- Estimate realistic total costs for all ${trip.dates.durationDays} days.
- Do not invent exact live prices or confirmed availability.
- Keep descriptions useful and concise.
`;

  const parsed = await callCloudflareAI(trip, prompt, 2000);

  const result = z
    .object({
      plan: PlanOverviewSchema,
    })
    .safeParse(parsed);

  if (!result.success) {
    console.error(
      "Invalid plan overview:",
      result.error.issues
    );

    throw new Error(
      "The AI returned an incomplete plan overview."
    );
  }

  const plan = result.data.plan;

  if (plan.id !== planId) {
    throw new Error("The AI returned an unexpected plan ID.");
  }

  const breakdown = plan.estimatedCost.breakdown;

  const total = Object.values(breakdown).reduce(
    (sum, amount) => sum + amount,
    0
  );

  const budget = trip.budget.totalGroupBudget;

  return {
    ...plan,

    estimatedCost: {
      total,
      perPerson:
        Math.round((total / trip.travellers.total) * 100) / 100,
      currency: trip.budget.currency,
      breakdown,
    },

    budgetFit:
      total > budget
        ? "over-budget"
        : total >= budget * 0.9
          ? "near-budget"
          : "within-budget",
  };
}

// --------------------------------------------------
// DAY PROMPT
// --------------------------------------------------

function buildDayPrompt({
  trip,
  planId,
  startDay,
  endDay,
  overview,
  previousDays,
  retryFeedback = "",
}) {
  const previousContext = previousDays.map((day) => ({
    day: day.day,
    title: day.title,
    attractions: cleanAttractions(day.attractions ?? []),
    morning: day.morning,
    afternoon: day.afternoon,
    evening: day.evening,
  }));

  const previousAttractions = previousDays.flatMap((day) =>
    cleanAttractions(day.attractions ?? []).map((name) => ({
      day: day.day,
      name,
    }))
  );

  const isFinalTripDay =
    endDay === trip.dates.durationDays;

  return `
Create itinerary days for one existing travel plan.

TRIP:
${JSON.stringify(trip, null, 2)}

PLAN OVERVIEW:
${JSON.stringify(overview, null, 2)}

PLAN STYLE:
${getPlanStyle(planId)}

PREVIOUSLY COMPLETED DAYS:
${JSON.stringify(previousContext, null, 2)}

PREVIOUSLY USED ATTRACTIONS:
${JSON.stringify(previousAttractions, null, 2)}

Generate days ${startDay} through ${endDay}, inclusive.

Return exactly ${endDay - startDay + 1} day objects.

Required day numbers:
${Array.from(
  { length: endDay - startDay + 1 },
  (_, index) => startDay + index
).join(", ")}

ATTRACTION RULES:
- Never repeat an attraction from any other day.
- Use real, identifiable sightseeing places suitable for the destination.
- Do not rename an existing attraction to bypass uniqueness.
- Activity descriptions must agree with the attractions array.
- Do not invent attractions.
- Use 1 to 8 genuine sightseeing attractions per normal sightseeing day.
- Railway stations are NOT sightseeing attractions.
- Airports are NOT sightseeing attractions.
- Bus stands and bus terminals are NOT sightseeing attractions.
- Metro stations and transit hubs are NOT sightseeing attractions.
- Do not put transport pickup points or drop-off points in attractions.
- Transport infrastructure may be mentioned in activity descriptions when needed.
- Keep attractions strictly for places visitors would actually visit.
- Different named places must remain distinct.
- For example, Calangute Beach and Calangute Market are different attractions.

FINAL DAY RULE:
${
  isFinalTripDay
    ? `- Day ${trip.dates.durationDays} is the final trip day.
- If the traveller is departing or transferring, attractions may be an empty array.
- Do not invent sightseeing just to fill the final day.
- Keep airport or station information in the activity descriptions only.`
    : `- Every requested day must contain at least one genuine sightseeing attraction.`
}

Return this JSON structure:

{
  "days": [
    {
      "day": ${startDay},
      "title": "Day title",
      "morning": "Morning activity",
      "afternoon": "Afternoon activity",
      "evening": "Evening activity",
      "attractions": [
        "Canonical attraction name"
      ],
      "estimatedCost": 1000,
      "localTip": "Practical local tip"
    }
  ]
}

REQUIRED FIELDS:
- day: integer.
- title: non-empty string.
- morning: non-empty string.
- afternoon: non-empty string.
- evening: non-empty string.
- attractions: array of genuine sightseeing places.
- estimatedCost: non-negative number in ${trip.budget.currency}.
- localTip: non-empty string.

Do not omit fields or use null.
Do not return days outside the requested range.
Return valid JSON only. No Markdown or code fences.

${retryFeedback}
`;
}

// --------------------------------------------------
// GENERATE AND VALIDATE DAYS
// --------------------------------------------------

async function requestDays({
  trip,
  planId,
  startDay,
  endDay,
  overview,
  previousDays,
}) {
  let retryFeedback = "";
  let lastValidationFailure = "";

  for (
    let attempt = 1;
    attempt <= MAX_CHUNK_ATTEMPTS;
    attempt += 1
  ) {
    console.log("Triply day generation attempt:", {
      planId,
      startDay,
      endDay,
      attempt,
      maxAttempts: MAX_CHUNK_ATTEMPTS,
    });

    const prompt = buildDayPrompt({
      trip,
      planId,
      startDay,
      endDay,
      overview,
      previousDays,
      retryFeedback,
    });

    const parsed = await callCloudflareAI(
      trip,
      prompt,
      endDay === startDay ? 1800 : 3500
    );

    const structureResult = z
      .object({
        days: z.array(z.unknown()).length(
          endDay - startDay + 1
        ),
      })
      .safeParse(parsed);

    if (!structureResult.success) {
      const issues = getValidationFeedback(
        structureResult.error.issues
      );

      lastValidationFailure = issues.join("; ");

      retryFeedback = `
Your previous response had an invalid days structure.
${issues.join("\n")}

Return exactly ${endDay - startDay + 1} complete day objects.
`;

      console.warn("Invalid day structure:", issues);
      continue;
    }

    const dayResult = z
      .array(DaySchema)
      .length(endDay - startDay + 1)
      .safeParse(structureResult.data.days);

    if (!dayResult.success) {
      const issues = getValidationFeedback(
        dayResult.error.issues
      );

      lastValidationFailure = issues.join("; ");

      retryFeedback = `
Your previous response had missing or invalid fields:
${issues.join("\n")}

Correct every listed field and return the complete requested days.
`;

      console.warn("Invalid day fields:", issues);
      continue;
    }

    const days = dayResult.data.map(cleanDay);

    const incorrectDay = days.find(
      (day, index) => day.day !== startDay + index
    );

    if (incorrectDay) {
      lastValidationFailure =
        `Incorrect day number ${incorrectDay.day}.`;

      retryFeedback = `
Return exact consecutive day numbers ${startDay} through ${endDay}.
Do not change the requested day numbers.
`;

      continue;
    }

    // An empty attraction list is permitted only on the final trip day.
    const invalidEmptyDay = days.find(
      (day) =>
        day.attractions.length === 0 &&
        day.day !== trip.dates.durationDays
    );

    if (invalidEmptyDay) {
      lastValidationFailure =
        `Day ${invalidEmptyDay.day} has no genuine sightseeing attractions.`;

      retryFeedback = `
Day ${invalidEmptyDay.day} had no genuine sightseeing attractions.
Generate at least one real sightseeing place for this day.
Do not use airports, railway stations, bus stands or transit hubs.
`;

      console.warn("Empty sightseeing day:", invalidEmptyDay.day);
      continue;
    }

    // Do not check duplicates here.
    // The targeted repair function handles them.
    return days;
  }

  throw new Error(
    `Unable to generate valid itinerary days ${startDay}-${endDay}. ` +
    lastValidationFailure
  );
}

// --------------------------------------------------
// TARGETED SINGLE-ATTRACTION REPAIR
// --------------------------------------------------

function buildAttractionRepairPrompt({
  trip,
  planId,
  day,
  duplicateAttraction,
  usedAttractions,
}) {
  return `
You are repairing one duplicate attraction in a travel itinerary.

DESTINATION:
${trip.destination}

PLAN STYLE:
${getPlanStyle(planId)}

DAY:
${JSON.stringify(day, null, 2)}

DUPLICATE ATTRACTION TO REPLACE:
${duplicateAttraction}

ATTRACTIONS ALREADY USED IN THIS ITINERARY:
${JSON.stringify(usedAttractions, null, 2)}

TASK:
Replace ONLY the duplicate attraction with one different, real,
identifiable sightseeing attraction in or reasonably near
${trip.destination}.

Do not select any attraction from the used attractions list.
Do not rename a used attraction.
Do not select an airport, railway station, bus stand, metro station,
transport terminal or generic activity.
Do not select the same attraction with a slightly different spelling.

Return exactly this JSON structure:

{
  "attraction": "New canonical attraction name",
  "timeOfDay": "morning",
  "activityDescription": "A useful replacement activity description"
}

timeOfDay must be exactly one of:
- morning
- afternoon
- evening

The activityDescription must describe the replacement attraction
and must not mention the duplicate attraction being replaced.

Return valid JSON only. No Markdown.
`;
}

async function requestReplacementAttraction({
  trip,
  planId,
  day,
  duplicateAttraction,
  usedAttractions,
}) {
  let lastError = "";

  const forbidden = [...usedAttractions];

  for (
    let attempt = 1;
    attempt <= MAX_ATTRACTION_REPAIR_ATTEMPTS;
    attempt += 1
  ) {
    console.log("Triply attraction repair attempt:", {
      planId,
      day: day.day,
      duplicateAttraction,
      attempt,
      maxAttempts: MAX_ATTRACTION_REPAIR_ATTEMPTS,
    });

    const prompt = buildAttractionRepairPrompt({
      trip,
      planId,
      day,
      duplicateAttraction,
      usedAttractions: forbidden,
    });

    let parsed;

    try {
      parsed = await callCloudflareAI(trip, prompt, 1000);
    } catch (error) {
      lastError = error.message;
      console.warn("Attraction repair request failed:", lastError);
      continue;
    }

    const result = AttractionRepairSchema.safeParse(parsed);

    if (!result.success) {
      lastError = getValidationFeedback(
        result.error.issues
      ).join("; ");

      console.warn("Invalid attraction repair response:", lastError);
      continue;
    }

    const replacement = result.data;

    if (isTransportInfrastructure(replacement.attraction)) {
      lastError = "Replacement was transport infrastructure.";
      forbidden.push(replacement.attraction);
      continue;
    }

    if (
      areSameAttraction(
        replacement.attraction,
        duplicateAttraction
      )
    ) {
      lastError = "Replacement was the same duplicate attraction.";
      forbidden.push(replacement.attraction);
      continue;
    }

    if (
      isAlreadyUsed(
        replacement.attraction,
        forbidden
      )
    ) {
      lastError = "Replacement attraction was already used.";
      forbidden.push(replacement.attraction);
      continue;
    }

    console.log("Attraction replacement accepted:", {
      day: day.day,
      oldAttraction: duplicateAttraction,
      newAttraction: replacement.attraction,
    });

    return replacement;
  }

  throw new Error(
    `Could not replace "${duplicateAttraction}" on day ${day.day}. ` +
    `Last issue: ${lastError}`
  );
}

// --------------------------------------------------
// APPLY ATTRACTION REPLACEMENT
// --------------------------------------------------

function applyAttractionReplacement(
  day,
  oldAttraction,
  replacement
) {
  const attractions = [...day.attractions];

  const index = attractions.findIndex((name) =>
    areSameAttraction(name, oldAttraction)
  );

  if (index === -1) {
    throw new Error(
      `Could not find "${oldAttraction}" on day ${day.day}.`
    );
  }

  attractions[index] = replacement.attraction;

  return {
    ...day,
    [replacement.timeOfDay]: replacement.activityDescription,
    attractions: cleanAttractions(attractions),
  };
}

// --------------------------------------------------
// REPAIR DUPLICATES WITHOUT REGENERATING THE DAY
// --------------------------------------------------

async function repairDuplicateDays({
  trip,
  planId,
  previousDays,
  generatedDays,
}) {
  let repairedDays = generatedDays.map((day) => ({
    ...day,
    attractions: [...day.attractions],
  }));

  // Each iteration repairs one duplicate at a time.
  // The loop has a strict upper bound to prevent infinite repair.
  const maxRepairs =
    Math.max(1, trip.dates.durationDays * 8);

  for (let repairCount = 0; repairCount < maxRepairs; repairCount += 1) {
    const duplicates = findDuplicateAttractions(
      previousDays,
      repairedDays
    );

    if (duplicates.length === 0) {
      return repairedDays;
    }

    const duplicate = duplicates[0];

    const currentDay = repairedDays.find(
      (day) => day.day === duplicate.day
    );

    if (!currentDay) {
      throw new Error(
        `Could not locate day ${duplicate.day} for repair.`
      );
    }

    // Protect every other day, including later days in this chunk.
    const protectedDays = [
      ...previousDays,
      ...repairedDays.filter(
        (day) => day.day !== duplicate.day
      ),
    ];

    // Also protect the non-duplicate attractions on this day.
    const sameDaySafeAttractions =
      currentDay.attractions.filter(
        (name) =>
          !areSameAttraction(
            name,
            duplicate.attraction
          )
      );

    const usedAttractions = [
      ...getUsedAttractions(protectedDays),
      ...sameDaySafeAttractions,
    ];

    const replacement = await requestReplacementAttraction({
      trip,
      planId,
      day: currentDay,
      duplicateAttraction: duplicate.attraction,
      usedAttractions,
    });

    const updatedDay = applyAttractionReplacement(
      currentDay,
      duplicate.attraction,
      replacement
    );

    repairedDays = repairedDays.map((day) =>
      day.day === duplicate.day ? updatedDay : day
    );

    console.log("Duplicate attraction repaired:", {
      planId,
      day: duplicate.day,
      oldAttraction: duplicate.attraction,
      newAttraction: replacement.attraction,
      repairCount: repairCount + 1,
    });
  }

  const remainingDuplicates = findDuplicateAttractions(
    previousDays,
    repairedDays
  );

  if (remainingDuplicates.length > 0) {
    console.error(
      "Duplicate repair limit reached:",
      remainingDuplicates
    );

    throw new Error(
      "Repeated attractions remain after targeted repair."
    );
  }

  return repairedDays;
}

// --------------------------------------------------
// COMPLETE CHUNK GENERATION
// --------------------------------------------------

async function generateDayChunk(
  trip,
  planId,
  startDay,
  endDay,
  overview,
  previousDays = []
) {
  let days = await requestDays({
    trip,
    planId,
    startDay,
    endDay,
    overview,
    previousDays,
  });

  let duplicates = findDuplicateAttractions(
    previousDays,
    days
  );

  if (duplicates.length > 0) {
    console.warn("Duplicate attractions detected:", duplicates);

    days = await repairDuplicateDays({
      trip,
      planId,
      previousDays,
      generatedDays: days,
    });
  }

  // Final schema validation.
  const finalResult = z
    .array(DaySchema)
    .length(endDay - startDay + 1)
    .safeParse(days);

  if (!finalResult.success) {
    console.error(
      "Final chunk validation failed:",
      finalResult.error.issues
    );

    throw new Error(
      `Final itinerary validation failed for days ${startDay}-${endDay}.`
    );
  }

  // Exact day sequence validation.
  const expectedNumbers = Array.from(
    { length: endDay - startDay + 1 },
    (_, index) => startDay + index
  );

  const actualNumbers = days.map((day) => day.day);

  if (
    JSON.stringify(expectedNumbers) !==
    JSON.stringify(actualNumbers)
  ) {
    throw new Error(
      `Incorrect day sequence in days ${startDay}-${endDay}.`
    );
  }

  // Empty attractions are allowed only on the final trip day.
  const invalidEmptyDay = days.find(
    (day) =>
      day.attractions.length === 0 &&
      day.day !== trip.dates.durationDays
  );

  if (invalidEmptyDay) {
    throw new Error(
      `Day ${invalidEmptyDay.day} has no sightseeing attractions.`
    );
  }

  // Final duplicate validation.
  const finalDuplicates = findDuplicateAttractions(
    previousDays,
    days
  );

  if (finalDuplicates.length > 0) {
    console.error(
      "Final duplicate validation failed:",
      finalDuplicates
    );

    throw new Error(
      `Repeated attractions remain in days ${startDay}-${endDay}.`
    );
  }

  // Ensure transport infrastructure never reaches final attractions.
  const hasTransportInfrastructure = days.some((day) =>
    day.attractions.some(isTransportInfrastructure)
  );

  if (hasTransportInfrastructure) {
    throw new Error(
      `Transport infrastructure found in attractions for days ${startDay}-${endDay}.`
    );
  }

  console.log("Triply chunk completed successfully:", {
    planId,
    startDay,
    endDay,
    days: days.length,
    duplicateCount: 0,
  });

  return days;
}

// --------------------------------------------------
// API HANDLER
// --------------------------------------------------

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);

    return sendError(
      res,
      405,
      "Method not allowed. Use POST."
    );
  }

  try {
    const body = req.body ?? {};

    const tripResult = TripBriefSchema.safeParse(body.trip);

    if (!tripResult.success) {
      console.error(
        "Invalid trip details:",
        tripResult.error.issues
      );

      return sendError(
        res,
        400,
        "Invalid trip details."
      );
    }

    const trip = tripResult.data;
    const { mode, planId } = body;

    if (!PLAN_IDS.includes(planId)) {
      return sendError(res, 400, "Invalid plan ID.");
    }

    // --------------------------------------------------
    // OVERVIEW MODE
    // --------------------------------------------------

    if (mode === "overview") {
      const plan = await generateOverview(trip, planId);

      return res.status(200).json({
        success: true,
        mode,
        plan,
      });
    }

    // --------------------------------------------------
    // DAYS MODE
    // --------------------------------------------------

    if (mode === "days") {
      const startDay = Number(body.startDay);
      const endDay = Number(body.endDay);

      if (
        !Number.isInteger(startDay) ||
        !Number.isInteger(endDay) ||
        startDay < 1 ||
        endDay < startDay ||
        endDay > trip.dates.durationDays ||
        endDay - startDay + 1 > MAX_CHUNK_DAYS
      ) {
        return sendError(
          res,
          400,
          `Request between 1 and ${MAX_CHUNK_DAYS} consecutive valid days.`
        );
      }

      const overviewResult =
        PlanOverviewSchema.safeParse(body.overview);

      if (
        !overviewResult.success ||
        overviewResult.data.id !== planId
      ) {
        return sendError(
          res,
          400,
          "Invalid plan overview."
        );
      }

      const previousDaysResult = z
        .array(DaySchema)
        .max(60)
        .safeParse(body.previousDays ?? []);

      if (!previousDaysResult.success) {
        console.error(
          "Invalid previous itinerary context:",
          previousDaysResult.error.issues
        );

        return sendError(
          res,
          400,
          "Invalid previous itinerary context."
        );
      }

      const previousDays = cleanPreviousDays(
        previousDaysResult.data
      );

      if (
        previousDays.length !== startDay - 1 ||
        previousDays.some(
          (day, index) => day.day !== index + 1
        )
      ) {
        return sendError(
          res,
          400,
          "Previous itinerary context must contain all preceding days in order."
        );
      }

      const days = await generateDayChunk(
        trip,
        planId,
        startDay,
        endDay,
        overviewResult.data,
        previousDays
      );

      return res.status(200).json({
        success: true,
        mode,
        planId,
        startDay,
        endDay,
        days,
      });
    }

    return sendError(
      res,
      400,
      'Invalid mode. Use "overview" or "days".'
    );
  } catch (error) {
    console.error("Triply chunk API error:", error);

    const timedOut =
      error?.name === "TimeoutError" ||
      error?.name === "AbortError";

    return sendError(
      res,
      timedOut ? 504 : 502,
      timedOut
        ? "This part of the itinerary took too long. Please retry."
        : error.message ||
          "Could not generate this itinerary part."
    );
  }
}