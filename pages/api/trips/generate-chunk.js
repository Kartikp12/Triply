import { z } from "zod";

const MODEL = "@cf/zai-org/glm-4.7-flash";
const MAX_CHUNK_DAYS = 4;

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
  title: z.string().min(1),
  morning: z.string().min(1),
  afternoon: z.string().min(1),
  evening: z.string().min(1),
  attractions: z.array(
    z.string().trim().min(2).max(120)
  ).min(1).max(8),
  estimatedCost: z.number().nonnegative(),
  localTip: z.string().min(1),
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

function findDuplicateAttractions(previousDays, candidateDays) {
  const seen = (previousDays ?? []).flatMap((day) =>
    (day.attractions ?? []).map((name) => ({
      name,
      day: day.day,
      normalized: normalizeAttraction(name),
    }))
  );

  const duplicates = [];

  for (const day of candidateDays) {
    for (const name of day.attractions ?? []) {
      const normalized = normalizeAttraction(name);

      if (!normalized) continue;

      const match = seen.find((item) => {
        const existing = item.normalized;

        if (!existing) return false;

        if (existing === normalized) return true;

        // Catch common variants such as:
        // "Futala Lake" and "Futala Lake Viewpoint".
        return (
          Math.min(existing.length, normalized.length) >= 7 &&
          (existing.includes(normalized) ||
            normalized.includes(existing))
        );
      });

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
          normalized,
        });
      }
    }
  }

  return duplicates;
}


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
            "Follow the requested JSON fields exactly. " +
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

async function generateDayChunk(
  trip,
  planId,
  startDay,
  endDay,
  overview,
  previousDays = []
) {
  let retryInstruction = "";

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const previousDayContext = previousDays.map((day) => ({
      day: day.day,
      title: day.title,
      attractions: day.attractions,
      morning: day.morning,
      afternoon: day.afternoon,
      evening: day.evening,
    }));

    const prompt = `
Create itinerary days for part of one existing travel plan.

TRIP:
${JSON.stringify(trip, null, 2)}

PLAN OVERVIEW:
${JSON.stringify(overview, null, 2)}

PLAN STYLE:
${getPlanStyle(planId)}

PREVIOUSLY COMPLETED DAYS FOR THIS SAME PLAN:
${JSON.stringify(previousDayContext, null, 2)}

IMPORTANT: THE PREVIOUS DAYS ARE PART OF THE SAME COMPLETE TRIP.

ATTRACTION UNIQUENESS RULES:
- Never recommend an attraction, landmark, named venue, market,
  garden, lake, temple, museum or other main destination already
  listed in the previous days' attractions arrays.
- Treat spelling variations and longer versions of the same place
  name as the same attraction.
- Do not repeat attractions between different days in this
  requested chunk either.
- Each day's attractions array must contain canonical, specific
  names of its main attractions, not generic activities.
- Activity descriptions must agree with the attraction names
  returned in that day's attractions array.
- Do not reuse a previous attraction merely by describing a
  different activity at the same place.
- Choose other suitable attractions in the destination instead.
- Do not invent places that you cannot reasonably identify as
  attractions at the requested destination.
- Normal travel logistics may recur when necessary, but the main
  sightseeing attractions must be distinct.

Generate days ${startDay} through ${endDay}, inclusive.
Return exactly ${endDay - startDay + 1} day objects.
The first day number must be ${startDay}.
The final day number must be ${endDay}.

Return this JSON structure:
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

Rules:
- Use places and activities that fit the destination and trip preferences.
- Every day must have morning, afternoon and evening activities.
- Return between 1 and 8 distinct, named attractions for each day.
- An attraction must not appear in multiple days of this trip.
- Keep each day's plan useful, realistic and concise.
- Do not invent bookings, live availability or confirmed prices.
- estimatedCost is a non-negative estimate in ${trip.budget.currency}.
- Do not return overview fields or days outside the requested range.
- Return valid JSON only, without Markdown or code fences.

${retryInstruction}
`;

    const parsed = await callCloudflareAI(trip, prompt, 2500);

    const result = z
      .object({
        days: z.array(DaySchema).length(endDay - startDay + 1),
      })
      .safeParse(parsed);

    if (!result.success) {
      console.error(
        `Invalid itinerary chunk (${startDay}-${endDay}):`,
        JSON.stringify(result.error.issues, null, 2)
      );

      if (attempt === 1) {
        retryInstruction =
          "Your previous response did not match the required JSON " +
          "structure. Return every required field, including the " +
          "attractions array for every day.";

        continue;
      }

      throw new Error(
        `The AI returned an incomplete itinerary for days ${startDay}-${endDay}.`
      );
    }

    const days = result.data.days;

    const invalidDayNumbers = days.some(
      (day, index) => day.day !== startDay + index
    );

    if (invalidDayNumbers) {
      if (attempt === 1) {
        retryInstruction =
          "Your previous response contained incorrect day numbers. " +
          "Return exactly the requested consecutive day numbers.";

        continue;
      }

      throw new Error(
        `The AI returned incorrect day numbers for days ${startDay}-${endDay}.`
      );
    }

    const duplicates = findDuplicateAttractions(previousDays, days);

    if (duplicates.length > 0) {
      console.warn("Duplicate attractions detected:", duplicates);

      if (attempt === 1) {
        retryInstruction = `
Your previous response repeated these attractions:
${JSON.stringify(duplicates, null, 2)}

Regenerate the entire requested chunk. Replace every duplicate
with a different, suitable attraction. Do not merely rename the
same place. Check all previously completed days and all days in
your new chunk before returning your JSON.
`;

        continue;
      }

      throw new Error(
        `Repeated attractions were detected in days ${startDay}-${endDay}. Please retry the itinerary generation.`
      );
    }

    return days;
  }

  throw new Error(
    `Unable to generate a unique itinerary for days ${startDay}-${endDay}.`
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);

    return sendError(res, 405, "Method not allowed. Use POST.");
  }

  try {
    const body = req.body ?? {};
    const tripResult = TripBriefSchema.safeParse(body.trip);

    if (!tripResult.success) {
      return sendError(res, 400, "Invalid trip details.");
    }

    const trip = tripResult.data;
    const { mode, planId } = body;

    if (!PLAN_IDS.includes(planId)) {
      return sendError(res, 400, "Invalid plan ID.");
    }

    if (mode === "overview") {
      const plan = await generateOverview(trip, planId);

      return res.status(200).json({
        success: true,
        mode,
        plan,
      });
    }

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

      const overviewResult = PlanOverviewSchema.safeParse(body.overview);

      if (
        !overviewResult.success ||
        overviewResult.data.id !== planId
      ) {
        return sendError(res, 400, "Invalid plan overview.");
      }


      const previousDaysResult = z
  .array(DaySchema)
  .max(60)
  .safeParse(body.previousDays ?? []);

if (!previousDaysResult.success) {
  return sendError(
    res,
    400,
    "Invalid previous itinerary context."
  );
}

const previousDays = previousDaysResult.data;

if (
  previousDays.length !== startDay - 1 ||
  previousDays.some((day, index) => day.day !== index + 1)
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
        : error.message || "Could not generate this itinerary part."
    );
  }
}