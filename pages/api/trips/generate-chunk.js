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
  overview
) {
  const prompt = `
Create itinerary days for part of one existing travel plan.

TRIP:
${JSON.stringify(trip, null, 2)}

PLAN OVERVIEW:
${JSON.stringify(overview, null, 2)}

PLAN STYLE:
${getPlanStyle(planId)}

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
      "morning": "Morning activity",
      "afternoon": "Afternoon activity",
      "evening": "Evening activity",
      "estimatedCost": 1000,
      "localTip": "Practical local tip"
    }
  ]
}

Rules:
- Use places and activities that fit the destination and trip preferences.
- Do not invent attractions, bookings, live availability or confirmed prices.
- Keep each day's plan useful, realistic and concise.
- Each day must have morning, afternoon and evening activities.
- Avoid repeating the same main activities across days.
- estimatedCost is a non-negative estimate in ${trip.budget.currency}.
- Do not return overview fields or days outside the requested range.
- Return valid JSON only.
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

    throw new Error(
      `The AI returned an incomplete itinerary for days ${startDay}-${endDay}.`
    );
  }

  const days = result.data.days;

  for (let index = 0; index < days.length; index += 1) {
    if (days[index].day !== startDay + index) {
      throw new Error(
        `The AI returned incorrect day numbers for days ${startDay}-${endDay}.`
      );
    }
  }

  return days;
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

      const days = await generateDayChunk(
        trip,
        planId,
        startDay,
        endDay,
        overviewResult.data
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