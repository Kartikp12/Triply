
import { z } from "zod";

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

function sendError(res, status, error, details) {
  return res.status(status).json({
    success: false,
    error,
    ...(details ? { details } : {}),
  });
}

export default function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);

    return sendError(
      res,
      405,
      "Method not allowed. Use POST."
    );
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

    return res.status(200).json({
      success: true,
      status: "validated",
      message:
        "Trip details validated successfully. AI plan generation is not connected yet.",
      trip,
      plans: [],
    });
  } catch (error) {
    console.error("Trip generation API error:", error);

    return sendError(
      res,
      500,
      "An unexpected server error occurred while validating your trip."
    );
  }
}
