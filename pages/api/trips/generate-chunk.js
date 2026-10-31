import { z } from "zod";

const MODEL = "@cf/zai-org/glm-4.7-flash";
const MAX_CHUNK_DAYS = 4;
const MAX_CHUNK_ATTEMPTS = 3;

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

const PLAN_IDS = [
  "budget-explorer",
  "balanced-escape",
  "premium-experience",
];

const PlanOverviewSchema = z.object({
  id: z.enum([
    "budget-explorer",
    "balanced-escape",
    "premium-experience",
  ]),
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
  attractions: z.array(
    z.string().trim().min(2).max(120)
  ).min(1).max(8),
  estimatedCost: z.number().nonnegative(),
  localTip: z.string().trim().min(1),
});

function sendError(res, status, error) {
  return res.status(status).json({
    success: false,
    error,
  });
}

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
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
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
// ATTRACTION NORMALIZATION AND DUPLICATE DETECTION
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

  if (a === b) return true;

  // Remove common generic suffixes to catch naming variations.
  const genericSuffixes = [
    "viewpoint",
    "view point",
    "view",
    "beach",
    "lake",
    "fort",
    "museum",
    "market",
    "garden",
    "temple",
    "church",
    "palace",
    "waterfall",
  ];

  function removeGenericSuffix(value) {
    let normalized = value;

    for (const suffix of genericSuffixes) {
      const ending = ` ${suffix}`;

      if (normalized.endsWith(ending)) {
        normalized = normalized.slice(0, -ending.length).trim();
        break;
      }
    }

    return normalized;
  }

  const baseA = removeGenericSuffix(a);
  const baseB = removeGenericSuffix(b);

  if (baseA.length >= 7 && baseA === baseB) {
    return true;
  }

  // Catch a specific place name followed by an extra descriptor,
  // but avoid arbitrary substring matches.
  const tokensA = a.split(" ");
  const tokensB = b.split(" ");

  const shorter = tokensA.length <= tokensB.length ? tokensA : tokensB;
  const longer = tokensA.length > tokensB.length ? tokensA : tokensB;

  if (
    shorter.length >= 2 &&
    shorter.length < longer.length &&
    shorter.every((token, index) => token === longer[index])
  ) {
    return true;
  }

  return false;
}

function findDuplicateAttractions(previousDays, candidateDays) {
  const seen = (previousDays ?? []).flatMap((day) =>
    (day.attractions ?? []).map((name) => ({
      name,
      day: day.day,
    }))
  );

  const duplicates = [];

  for (const day of candidateDays) {
    for (const name of day.attractions ?? []) {
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

// --------------------------------------------------
// VALIDATION ERROR DETAILS FOR AI RETRIES
// --------------------------------------------------

function getValidationFeedback(issues) {
  return issues.map((issue) => {
    const field = issue.path.length
      ? issue.path.join(".")
      : "response";

    return `Field: ${field}. Problem: ${issue.message}`;
  });
}

// --------------------------------------------------
// CLOUDFLARE AI
// --------------------------------------------------

async function callCloudflareAI(trip, prompt, maxTokens) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    throw new Error("Cloudflare AI credentials are not configured.");
  }

  const endpoint =
    `https://api.cloudflare.com/client/v4/accounts/` +
    `${accountId}/ai/run/${MODEL}`;

  const startedAt = Date.now();

  console.log("Triply chunk generation started:", {
    destination: trip.destination,
    maxTokens,
  });

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
            "Return valid JSON only, with no Markdown. " +
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

  const data = await response.json();

  console.log("Triply chunk provider response:", {
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
// PLAN OVERVIEW GENERATION
// --------------------------------------------------

async function generateOverview(trip, planId) {
  const prompt = `
Create the overview for exactly one travel plan.

TRIP:
${JSON.stringify(trip, null, 2)}

PLAN ID: ${planId}
PLAN STYLE: ${getPlanStyle(planId)}

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
    "highlights": ["Highlight 1", "Highlight 2", "Highlight 3"],
    "staySuggestion": "Accommodation guidance",
    "transportPlan": "Transport guidance",
    "bestFor": "Suitable travellers",
    "chatbotContext": "Plan details and assumptions"
  }
}

Rules:
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
      JSON.stringify(result.error.issues, null, 2)
    );

    throw new Error("The AI returned an incomplete plan overview.");
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
// CHUNK PROMPT
// --------------------------------------------------

function buildDayChunkPrompt({
  trip,
  planId,
  startDay,
  endDay,
  overview,
  previousDays,
  retryFeedback,
}) {
  const previousDayContext = previousDays.map((day) => ({
    day: day.day,
    title: day.title,
    attractions: day.attractions,
    morning: day.morning,
    afternoon: day.afternoon,
    evening: day.evening,
  }));

  const previousAttractions = previousDays.flatMap((day) =>
    (day.attractions ?? []).map((name) => ({
      day: day.day,
      name,
    }))
  );

  return `
Create itinerary days for part of one existing travel plan.

TRIP:
${JSON.stringify(trip, null, 2)}

PLAN OVERVIEW:
${JSON.stringify(overview, null, 2)}

PLAN STYLE:
${getPlanStyle(planId)}

PREVIOUSLY COMPLETED DAYS FOR THIS SAME PLAN:
${JSON.stringify(previousDayContext, null, 2)}

PREVIOUSLY USED ATTRACTIONS:
${JSON.stringify(previousAttractions, null, 2)}

IMPORTANT: THE PREVIOUS DAYS ARE PART OF THE SAME COMPLETE TRIP.

ATTRACTION UNIQUENESS RULES:
- Never repeat any attraction from the previously used attractions list.
- Never repeat the same attraction on two days in the requested chunk.
- Treat spelling variations and descriptive name variations as the same place.
- Do not reuse a previous attraction by describing a different activity at the same place.
- Each day's attractions array must contain canonical, specific names of its main attractions.
- Activity descriptions must agree with the attraction names in that day's attractions array.
- Choose other suitable attractions in the destination.
- Do not invent places that cannot reasonably be identified as attractions at the requested destination.
- Normal travel logistics may recur when necessary, but main sightseeing attractions must be distinct.

GENERATE DAYS ${startDay} THROUGH ${endDay}, INCLUSIVE.

Return exactly ${endDay - startDay + 1} day objects.
Day numbers must be consecutive and exact:
${Array.from(
  { length: endDay - startDay + 1 },
  (_, index) => startDay + index
).join(", ")}

RETURN THIS JSON STRUCTURE:
{
  "days": [
    {
      "day": ${startDay},
      "title": "Day title",
      "morning": "Morning activity including its main place",
      "afternoon": "Afternoon activity including its main place",
      "evening": "Evening activity including its main place",
      "attractions": [
        "Canonical name of a main attraction",
        "Canonical name of another main attraction"
      ],
      "estimatedCost": 1000,
      "localTip": "Practical local tip"
    }
  ]
}

REQUIRED FIELD RULES:
- Every day MUST contain all eight fields:
  day, title, morning, afternoon, evening, attractions, estimatedCost, localTip.
- morning, afternoon, evening, title and localTip must be non-empty strings.
- attractions must be an array containing 1 to 8 distinct named attractions.
- estimatedCost must be a non-negative number.
- Do not omit a field.
- Do not use null for any field.
- Do not return fewer or more days than requested.
- Do not return overview fields or days outside the requested range.
- Use places and activities that fit the destination and trip preferences.
- Do not invent bookings, live availability or confirmed prices.
- estimatedCost is an estimate in ${trip.budget.currency}.
- Return valid JSON only, without Markdown or code fences.

${retryFeedback ? `
IMPORTANT CORRECTION REQUIRED:
Your previous response failed validation.

${retryFeedback}

Fix every listed problem before returning the new JSON.
Do not repeat the same invalid response.
Return the complete requested chunk again.
` : ""}
`;
}

// --------------------------------------------------
// DAY CHUNK GENERATION WITH CONTROLLED RECOVERY
// --------------------------------------------------

async function generateDayChunk(
  trip,
  planId,
  startDay,
  endDay,
  overview,
  previousDays = []
) {
  let retryFeedback = "";
  let lastFailure = null;

  for (
    let attempt = 1;
    attempt <= MAX_CHUNK_ATTEMPTS;
    attempt += 1
  ) {
    console.log("Triply chunk attempt:", {
      planId,
      startDay,
      endDay,
      attempt,
      maxAttempts: MAX_CHUNK_ATTEMPTS,
    });

    const prompt = buildDayChunkPrompt({
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
      3500
    );

    const result = z
      .object({
        days: z.array(z.unknown()).length(
          endDay - startDay + 1
        ),
      })
      .safeParse(parsed);

    if (!result.success) {
      const feedback = getValidationFeedback(
        result.error.issues
      );

      console.error(
        `Invalid chunk structure (${startDay}-${endDay}):`,
        feedback
      );

      lastFailure = "invalid-structure";

      retryFeedback = `
The response must contain exactly ${
        endDay - startDay + 1
      } objects inside the days array.

Validation errors:
${feedback.join("\n")}

Return every requested day with every required field.
`;

      if (attempt < MAX_CHUNK_ATTEMPTS) {
        continue;
      }

      break;
    }

    const daysResult = z
      .array(DaySchema)
      .length(endDay - startDay + 1)
      .safeParse(result.data.days);

    if (!daysResult.success) {
      const feedback = getValidationFeedback(
        daysResult.error.issues
      );

      console.error(
        `Invalid itinerary fields (${startDay}-${endDay}):`,
        JSON.stringify(daysResult.error.issues, null, 2)
      );

      lastFailure = "missing-or-invalid-fields";

      retryFeedback = `
Your previous response contained missing or invalid fields.

Exact validation errors:
${feedback.join("\n")}

For every listed day:
- Provide all required fields.
- morning, afternoon and evening must be non-empty strings.
- attractions must be an array of named places.
- estimatedCost must be a non-negative number.
- localTip must be a non-empty string.

Do not omit any field. Return the complete chunk again.
`;

      if (attempt < MAX_CHUNK_ATTEMPTS) {
        continue;
      }

      break;
    }

    const days = daysResult.data;

    // Verify exact consecutive day numbers.
    const invalidDayNumbers = days
      .filter((day, index) => day.day !== startDay + index)
      .map((day) => ({
        received: day.day,
        expected: startDay + days.indexOf(day),
      }));

    if (invalidDayNumbers.length > 0) {
      console.warn(
        "Incorrect day numbers detected:",
        invalidDayNumbers
      );

      lastFailure = "invalid-day-numbers";

      retryFeedback = `
Your previous response contained incorrect day numbers.

Expected consecutive day numbers:
${Array.from(
  { length: endDay - startDay + 1 },
  (_, index) => startDay + index
).join(", ")}

Incorrect values:
${JSON.stringify(invalidDayNumbers, null, 2)}

Return exactly the expected day numbers in the correct order.
`;

      if (attempt < MAX_CHUNK_ATTEMPTS) {
        continue;
      }

      break;
    }

    // Verify attractions are unique across previous and new days.
    const duplicates = findDuplicateAttractions(
      previousDays,
      days
    );

    if (duplicates.length > 0) {
      console.warn(
        "Duplicate attractions detected:",
        duplicates
      );

      lastFailure = "duplicate-attractions";

      retryFeedback = `
Your previous response repeated attractions.

Duplicate details:
${JSON.stringify(duplicates, null, 2)}

Previously completed days and their attractions:
${JSON.stringify(
  previousDays.map((day) => ({
    day: day.day,
    attractions: day.attractions,
  })),
  null,
  2
)}

You MUST replace every duplicate with a genuinely different,
suitable attraction.

Do not rename the same place.
Do not use spelling variations of the same place.
Do not repeat attractions between any two days in this chunk.
Check all attraction names before returning the response.

Return the complete requested chunk again.
`;

      if (attempt < MAX_CHUNK_ATTEMPTS) {
        continue;
      }

      break;
    }

    console.log("Triply chunk validated successfully:", {
      planId,
      startDay,
      endDay,
      attempt,
      dayCount: days.length,
    });

    return days;
  }

  console.error("Triply chunk generation exhausted retries:", {
    planId,
    startDay,
    endDay,
    attempts: MAX_CHUNK_ATTEMPTS,
    lastFailure,
  });

  if (lastFailure === "duplicate-attractions") {
    throw new Error(
      `Repeated attractions were detected in days ${startDay}-${endDay} after ${MAX_CHUNK_ATTEMPTS} attempts.`
    );
  }

  if (lastFailure === "invalid-day-numbers") {
    throw new Error(
      `The AI returned incorrect day numbers for days ${startDay}-${endDay} after ${MAX_CHUNK_ATTEMPTS} attempts.`
    );
  }

  throw new Error(
    `The AI returned an incomplete or invalid itinerary for days ${startDay}-${endDay} after ${MAX_CHUNK_ATTEMPTS} attempts.`
  );
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
      return sendError(
        res,
        400,
        "Invalid plan ID."
      );
    }

    // ----------------------------------------------
    // OVERVIEW MODE
    // ----------------------------------------------

    if (mode === "overview") {
      const plan = await generateOverview(
        trip,
        planId
      );

      return res.status(200).json({
        success: true,
        mode,
        plan,
      });
    }

    // ----------------------------------------------
    // DAYS MODE
    // ----------------------------------------------

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

      const previousDays = previousDaysResult.data;

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
    console.error(
      "Triply chunk API error:",
      error
    );

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