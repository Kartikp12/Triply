
import { z } from "zod";

const MODEL = "@cf/zai-org/glm-4.7-flash";

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

const CostBreakdownSchema = z.object({
  intercityTransport: z.number().nonnegative(),
  accommodation: z.number().nonnegative(),
  food: z.number().nonnegative(),
  localTransport: z.number().nonnegative(),
  activities: z.number().nonnegative(),
  miscellaneous: z.number().nonnegative(),
});

const GeneratedPlanSchema = z.object({
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
    breakdown: CostBreakdownSchema,
  }),

  highlights: z.array(z.string().min(1)).min(3).max(6),
  staySuggestion: z.string().min(1),
  transportPlan: z.string().min(1),
  bestFor: z.string().min(1),

  days: z.array(
    z.object({
      day: z.number().int().positive(),
      title: z.string().min(1),
      morning: z.string().min(1),
      afternoon: z.string().min(1),
      evening: z.string().min(1),
      estimatedCost: z.number().nonnegative(),
      localTip: z.string().min(1),
    })
  ),

  chatbotContext: z.string().min(1),
});

function sendError(res, status, error, details) {
  return res.status(status).json({
    success: false,
    error,
    ...(details ? { details } : {}),
  });
}

function buildPrompt(trip) {
  return `
Create exactly 3 distinct travel plans using the trip details below.

TRIP DETAILS:
${JSON.stringify(trip, null, 2)}

REQUIRED PLANS:
1. budget-explorer: Budget Explorer — economical accommodation,
   affordable food and cost-conscious activities.
2. balanced-escape: Balanced Escape — a balanced mix of comfort,
   experiences and cost.
3. premium-experience: Premium Experience — better comfort and
   memorable experiences while respecting the available budget
   wherever realistically possible.

IMPORTANT RULES:
- Return a JSON object only. Do not use Markdown or code fences.
- The JSON object must contain exactly one property: "plans".
- "plans" must contain exactly 3 plans in the order specified above.
- Follow the exact output structure provided below.
- Each plan must contain exactly ${trip.dates.durationDays} day entries.
- Day numbers must start at 1 and end at ${trip.dates.durationDays}.
- Use ${trip.budget.currency} for every cost.
- The total budget for the entire group is ${trip.budget.totalGroupBudget}.
- Make estimated costs realistic and internally consistent. The sum of
  the cost breakdown must equal estimatedCost.total.
- Per-person cost must equal total cost divided by ${trip.travellers.total}.
- If includesIntercityTransport is false, set intercityTransport to 0
  in the cost breakdown and do not include that expense in the total.
- Try to keep each plan within the total group budget. Never hide
  an over-budget estimate; the application will identify it.
- Do not claim that hotel rooms, tickets, or transport are booked.
- Do not invent live availability, exact live fares, or confirmed prices.
  All costs are estimates.
- Suggest plausible places, activities and transport options. Do not
  invent attractions. When uncertain, keep recommendations general.
- Each day must have useful morning, afternoon and evening activities.
- Keep the plans meaningfully different, not just differently named.
- chatbotContext should summarize the complete plan and its important
  assumptions so a separate AI chatbot can answer questions about it.

REQUIRED JSON STRUCTURE:
{
  "plans": [
    {
      "id": "budget-explorer",
      "name": "Budget Explorer",
      "tagline": "Short descriptive tagline",
      "summary": "Plan overview",
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
        "Highlight one",
        "Highlight two",
        "Highlight three"
      ],
      "staySuggestion": "Type of accommodation and suggested area",
      "transportPlan": "Suggested transport approach",
      "bestFor": "Who this plan suits",
      "days": [
        {
          "day": 1,
          "title": "Day title",
          "morning": "Morning activity",
          "afternoon": "Afternoon activity",
          "evening": "Evening activity",
          "estimatedCost": 1000,
          "localTip": "Practical tip"
        }
      ],
      "chatbotContext": "Detailed context for the plan-specific chatbot"
    }
  ]
}

Return the actual plan data, not the example values. Ensure all numeric
costs are non-negative numbers, and the breakdown total is consistent.
`;
}


function extractModelText(data) {
    const result = data?.result;
  
    // Log response structure only; do not log credentials.
    console.log("Cloudflare result keys:", Object.keys(result ?? {}));
  
    const candidates = [
      result?.response,
      result?.output_text,
      result?.choices?.[0]?.message?.content,
      result?.choices?.[0]?.text,
      result?.content,
    ];
  
    const text = candidates.find(
      (value) => typeof value === "string" && value.trim().length > 0
    );
  
    if (text) {
      return text;
    }
  
    console.error(
      "Cloudflare returned no usable text. Result preview:",
      JSON.stringify(result ?? null).slice(0, 1500)
    );
  
    return null;
  }
  

function parseModelJSON(text) {
  if (!text) {
    throw new Error("The AI model returned an empty response.");
  }

  let cleaned = text.trim();

  cleaned = cleaned
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace <= firstBrace) {
      throw new Error("The AI model did not return valid JSON.");
    }

    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
  }
}


async function generateTripPlans(trip) {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  
    if (!accountId || !apiToken) {
      throw new Error("Cloudflare AI credentials are not configured.");
    }
  
    const endpoint =
      `https://api.cloudflare.com/client/v4/accounts/` +
      `${accountId}/ai/run/@cf/zai-org/glm-4.7-flash`;
  
    // Keep output proportional to trip length.
    // Disable the model's extra reasoning to reduce response latency.
    const maxTokens = Math.min(
      6000,
      Math.max(3000, trip.dates.durationDays * 650)
    );
  
    console.log(
      `Generating Triply plans: ${trip.dates.durationDays} days, ` +
      `${trip.travellers.total} travellers, max tokens ${maxTokens}`
    );
  
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
              "You are Triply, a travel-planning assistant. " +
              "Generate concise, realistic travel itineraries. " +
              "Return valid JSON only, without Markdown or explanations. " +
              "Do not reveal or perform extended reasoning. " +
              "All costs are estimates, never confirmed live prices. " +
              "Follow every requested plan ID and output field exactly.",
          },
          {
            role: "user",
            content: buildPrompt(trip),
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
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(90000),
    });
  
    const data = await response.json();
  
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
  
    const modelText = extractModelText(data);
    const parsed = parseModelJSON(modelText);
  
    const validated = z
      .object({
        plans: z.array(GeneratedPlanSchema).length(3),
      })
      .safeParse(parsed);
  
    if (!validated.success) {
      console.error(
        "Invalid AI plan structure:",
        JSON.stringify(validated.error.issues, null, 2)
      );
  
      throw new Error("The AI returned plans in an unexpected format.");
    }
  
    const requiredIds = [
      "budget-explorer",
      "balanced-escape",
      "premium-experience",
    ];
  
    const plans = validated.data.plans.map((plan, index) => {
      if (
        plan.id !== requiredIds[index] ||
        plan.days.length !== trip.dates.durationDays
      ) {
        throw new Error(
          "The AI returned incomplete or incorrectly ordered plans."
        );
      }
  
      for (let dayIndex = 0; dayIndex < plan.days.length; dayIndex += 1) {
        if (plan.days[dayIndex].day !== dayIndex + 1) {
          throw new Error("The AI returned invalid itinerary day numbers.");
        }
      }
  
      const breakdown = plan.estimatedCost.breakdown;
  
      const total = Object.values(breakdown).reduce(
        (sum, amount) => sum + amount,
        0
      );
  
      const budget = trip.budget.totalGroupBudget;
  
      let budgetFit = "within-budget";
  
      if (total > budget) {
        budgetFit = "over-budget";
      } else if (total >= budget * 0.9) {
        budgetFit = "near-budget";
      }
  
      return {
        ...plan,
        estimatedCost: {
          total,
          perPerson:
            Math.round((total / trip.travellers.total) * 100) / 100,
          currency: trip.budget.currency,
          breakdown,
        },
        budgetFit,
      };
    });
  
    console.log("Triply successfully generated three travel plans.");
  
    return plans;
  }
  

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);

    return sendError(res, 405, "Method not allowed. Use POST.");
  }

  try {
    const result = TripBriefSchema.safeParse(req.body);

    if (!result.success) {
      return sendError(
        res,
        400,
        "Invalid trip details.",
        result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        }))
      );
    }

    const trip = result.data;

    const departureDate = trip.dates.departureDate;
    const returnDate = trip.dates.returnDate;

    if (returnDate <= departureDate) {
      return sendError(
        res,
        400,
        "Return date must be after departure date."
      );
    }

    const expectedNights =
      (Date.parse(`${returnDate}T00:00:00.000Z`) -
        Date.parse(`${departureDate}T00:00:00.000Z`)) /
      86400000;

    if (
      trip.dates.nights !== expectedNights ||
      trip.dates.durationDays !== expectedNights + 1
    ) {
      return sendError(
        res,
        400,
        "Trip duration does not match the selected dates."
      );
    }

    if (trip.budget.amount !== trip.budget.totalGroupBudget) {
      return sendError(
        res,
        400,
        "The total trip budget values must match."
      );
    }

    const hasAdults = trip.travellers.adults != null;
    const hasChildren = trip.travellers.children != null;

    if (hasAdults !== hasChildren) {
      return sendError(
        res,
        400,
        "Provide both adult and child counts, or leave both empty."
      );
    }

    if (
      hasAdults &&
      trip.travellers.adults + trip.travellers.children !==
        trip.travellers.total
    ) {
      return sendError(
        res,
        400,
        "Adult and child counts must equal the total travellers."
      );
    }

    const plans = await generateTripPlans(trip);

    return res.status(200).json({
      success: true,
      status: "generated",
      message: "Your three AI-generated travel plans are ready.",
      trip,
      plans,
    });
  } catch (error) {
    console.error("Trip generation API error:", error);

    if (
      error?.name === "TimeoutError" ||
      error?.name === "AbortError"
    ) {
      return sendError(
        res,
        504,
        "AI generation took too long. Please try again."
      );
    }

    return sendError(
      res,
      502,
      "We could not generate your trip plans. Please try again."
    );
  }
}
