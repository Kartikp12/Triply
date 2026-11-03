
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "../../../../lib/firebaseAdmin";
import { generateTripAssistantReply } from "../../../../lib/tripAssistant";

const MAX_MESSAGE_LENGTH = 1500;
const HISTORY_LIMIT = 30;
const MODEL_HISTORY_LIMIT = 12;

function sendError(res, status, message) {
  return res.status(status).json({
    success: false,
    error: message,
  });
}

async function authenticateRequest(req, adminAuth) {
  const authorization = req.headers.authorization || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match) return null;

  try {
    return await adminAuth.verifyIdToken(match[1]);
  } catch {
    return null;
  }
}

function serializeMessage(snapshot) {
  const data = snapshot.data();
  const createdAt = data.createdAt?.toDate
    ? data.createdAt.toDate().toISOString()
    : null;

  return {
    id: snapshot.id,
    role: data.role,
    content: data.content,
    sources: Array.isArray(data.sources) ? data.sources : [],
    activePlanId: data.activePlanId || null,
    createdAt,
  };
}

async function loadOwnedTrip(db, uid, tripId) {
  const tripRef = db.collection("trips").doc(tripId);
  const tripSnapshot = await tripRef.get();

  if (!tripSnapshot.exists) {
    return { error: "This saved trip is no longer available.", status: 404 };
  }

  const tripData = tripSnapshot.data();

  if (tripData.ownerUid !== uid) {
    return {
      error: "This trip is not available for this account.",
      status: 403,
    };
  }

  const plansSnapshot = await tripRef.collection("plans").get();

  const plans = plansSnapshot.docs.map((planDoc) => ({
    id: planDoc.id,
    ...planDoc.data(),
  }));

  return {
    trip: { id: tripSnapshot.id, ...tripData },
    plans,
    tripRef,
  };
}

export default async function handler(req, res) {
  if (!["GET", "POST", "DELETE"].includes(req.method)) {
    res.setHeader("Allow", ["GET", "POST", "DELETE"]);
    return sendError(res, 405, "Method not allowed.");
  }

  res.setHeader("Cache-Control", "private, no-store, max-age=0");

  const tripId = Array.isArray(req.query.tripId)
    ? req.query.tripId[0]
    : req.query.tripId;

  if (
    !tripId ||
    typeof tripId !== "string" ||
    tripId.length > 180 ||
    tripId.includes("/")
  ) {
    return sendError(res, 400, "A valid trip ID is required.");
  }

  let admin;

  try {
    admin = getFirebaseAdmin();
  } catch (error) {
    console.error("Trip assistant Firebase Admin setup error:", error.message);

    return sendError(
      res,
      503,
      "Trip assistant server authentication is not configured yet."
    );
  }

  const decodedToken = await authenticateRequest(req, admin.auth);

  if (!decodedToken) {
    return sendError(
      res,
      401,
      "Please sign in again to use your trip assistant."
    );
  }

  let ownedTrip;

  try {
    ownedTrip = await loadOwnedTrip(admin.db, decodedToken.uid, tripId);
  } catch (error) {
    console.error("Unable to read trip for assistant:", error);

    return sendError(
      res,
      500,
      "Your saved trip could not be loaded right now."
    );
  }

  if (ownedTrip.error) {
    return sendError(ownedTrip.status, ownedTrip.error);
  }

  const messagesRef = ownedTrip.tripRef.collection("messages");

  // Clear only conversation messages. Keep the trip and all plans intact.
  if (req.method === "DELETE" && req.query.action === "clear-chat") {
    try {
      await admin.db.recursiveDelete(messagesRef);

      return res.status(200).json({
        success: true,
        message: "Conversation cleared successfully.",
      });
    } catch (error) {
      console.error("Unable to clear trip assistant conversation:", error);

      return sendError(
        res,
        500,
        "Your conversation could not be cleared right now."
      );
    }
  }

  // Preserve the existing saved-trip deletion behavior.
  if (req.method === "DELETE") {
    try {
      await admin.db.recursiveDelete(ownedTrip.tripRef);

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Unable to delete saved trip and conversation:", error);

      return sendError(
        res,
        500,
        "This saved trip could not be deleted right now."
      );
    }
  }

  if (ownedTrip.plans.length === 0) {
    return sendError(
      res,
      409,
      "This trip does not have saved itinerary options yet."
    );
  }

  if (req.method === "GET") {
    try {
      const snapshot = await messagesRef
        .orderBy("createdAt", "desc")
        .limit(HISTORY_LIMIT)
        .get();

      const messages = snapshot.docs.reverse().map(serializeMessage);

      return res.status(200).json({
        success: true,
        messages,
      });
    } catch (error) {
      console.error("Unable to load trip assistant history:", error);

      return sendError(
        res,
        500,
        "Your trip conversation could not be loaded."
      );
    }
  }

  const userMessage =
    typeof req.body?.message === "string" ? req.body.message.trim() : "";

  const requestedPlanId =
    typeof req.body?.activePlanId === "string"
      ? req.body.activePlanId
      : "";

  if (!userMessage) {
    return sendError(res, 400, "Write a question to start the conversation.");
  }

  if (userMessage.length > MAX_MESSAGE_LENGTH) {
    return sendError(
      res,
      400,
      `Keep each message under ${MAX_MESSAGE_LENGTH} characters.`
    );
  }

  const activePlanId = ownedTrip.plans.some(
    (plan) => plan.id === requestedPlanId
  )
    ? requestedPlanId
    : "";

  let userMessageRef = null;

  try {
    const historySnapshot = await messagesRef
      .orderBy("createdAt", "desc")
      .limit(MODEL_HISTORY_LIMIT)
      .get();

    const history = historySnapshot.docs
      .reverse()
      .map((snapshot) => snapshot.data())
      .filter((message) => ["user", "assistant"].includes(message.role))
      .map((message) => ({
        role: message.role,
        content: String(message.content || "").slice(0, 6000),
      }));

    userMessageRef = await messagesRef.add({
      role: "user",
      content: userMessage,
      activePlanId: activePlanId || null,
      sources: [],
      createdAt: FieldValue.serverTimestamp(),
    });

    const reply = await generateTripAssistantReply({
      trip: ownedTrip.trip,
      plans: ownedTrip.plans,
      activePlanId,
      history,
      userMessage,
    });

    const assistantMessageRef = await messagesRef.add({
      role: "assistant",
      content: reply.content,
      activePlanId: activePlanId || null,
      sources: reply.sources,
      createdAt: FieldValue.serverTimestamp(),
    });

    return res.status(200).json({
      success: true,
      userMessage: {
        id: userMessageRef.id,
        role: "user",
        content: userMessage,
        activePlanId: activePlanId || null,
      },
      assistantMessage: {
        id: assistantMessageRef.id,
        role: "assistant",
        content: reply.content,
        sources: reply.sources,
        activePlanId: activePlanId || null,
      },
    });
  } catch (error) {
    if (userMessageRef) {
      await userMessageRef.delete().catch((cleanupError) => {
        console.error(
          "Unable to clean up failed trip assistant message:",
          cleanupError
        );
      });
    }

    console.error("Trip assistant request failed:", error);

    return sendError(
      res,
      502,
      error?.message || "The trip assistant could not complete this response."
    );
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "16kb",
    },
  },
  maxDuration: 60,
};
