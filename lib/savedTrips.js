import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    serverTimestamp,
    where,
    writeBatch,
  } from "firebase/firestore";
  
  import { db } from "./firebase";
  
  const PLAN_ORDER = [
    "budget-explorer",
    "balanced-escape",
    "premium-experience",
  ];
  
  function requireFirestore() {
    if (!db) {
      throw new Error(
        "Firestore is not configured. Check your Firebase environment variables."
      );
    }
  }
  
  function toPlainData(value) {
    return JSON.parse(JSON.stringify(value));
  }
  
  function getCreatedAtValue(value) {
    if (value?.toMillis) return value.toMillis();
    if (typeof value === "string") return new Date(value).getTime() || 0;
    return 0;
  }
  
  export async function saveTrip({ uid, tripBrief, plans }) {
    requireFirestore();
  
    if (!uid) {
      throw new Error("Please sign in before saving a trip.");
    }
  
    if (!tripBrief || !Array.isArray(plans) || plans.length !== 3) {
      throw new Error("A complete trip with all three plans is required.");
    }
  
    const validPlans = plans.filter(
      (plan) => plan && PLAN_ORDER.includes(plan.id)
    );
  
    if (
      validPlans.length !== 3 ||
      PLAN_ORDER.some(
        (planId) => !validPlans.some((plan) => plan.id === planId)
      )
    ) {
      throw new Error("The three travel plan options are incomplete.");
    }
  
    const tripRef = doc(collection(db, "trips"));
  
    const safeTripBrief = toPlainData(tripBrief);
    const safePlans = validPlans.map((plan) => toPlainData(plan));
  
    const batch = writeBatch(db);
  
    batch.set(tripRef, {
      ownerUid: uid,
      tripBrief: safeTripBrief,
  
      origin: safeTripBrief.origin,
      destination: safeTripBrief.destination,
  
      departureDate: safeTripBrief.dates?.departureDate || null,
      returnDate: safeTripBrief.dates?.returnDate || null,
      durationDays: safeTripBrief.dates?.durationDays || null,
  
      travellerCount: safeTripBrief.travellers?.total || null,
      groupType: safeTripBrief.travellers?.groupType || null,
  
      budgetAmount:
        safeTripBrief.budget?.totalGroupBudget ?? null,
  
      budgetCurrency:
        safeTripBrief.budget?.currency || "INR",
  
      planIds: PLAN_ORDER,
  
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  
    safePlans.forEach((plan) => {
      batch.set(
        doc(db, "trips", tripRef.id, "plans", plan.id),
        {
          ...plan,
          savedAt: serverTimestamp(),
        }
      );
    });
  
    await batch.commit();
  
    return tripRef.id;
  }
  
  export async function getSavedTrips(uid) {
    requireFirestore();
  
    if (!uid) {
      throw new Error("Please sign in to view your saved trips.");
    }
  
    const tripsQuery = query(
      collection(db, "trips"),
      where("ownerUid", "==", uid)
    );
  
    const snapshot = await getDocs(tripsQuery);
  
    const trips = snapshot.docs.map((tripDoc) => ({
      id: tripDoc.id,
      ...tripDoc.data(),
    }));
  
    return trips.sort(
      (a, b) =>
        getCreatedAtValue(b.createdAt) -
        getCreatedAtValue(a.createdAt)
    );
  }
  
  export async function getSavedTrip(uid, tripId) {
    requireFirestore();
  
    if (!uid || !tripId) {
      throw new Error("A signed-in user and trip ID are required.");
    }
  
    const tripRef = doc(db, "trips", tripId);
  
    const tripSnapshot = await getDoc(tripRef);
  
    if (!tripSnapshot.exists()) {
      return null;
    }
  
    const trip = tripSnapshot.data();
  
    if (trip.ownerUid !== uid) {
      throw new Error("You do not have permission to view this trip.");
    }
  
    const plansSnapshot = await getDocs(
      collection(db, "trips", tripId, "plans")
    );
  
    const plansById = new Map(
      plansSnapshot.docs.map((planDoc) => [
        planDoc.id,
        planDoc.data(),
      ])
    );
  
    const plans = PLAN_ORDER
      .map((planId) => plansById.get(planId))
      .filter(Boolean);
  
    return {
      id: tripSnapshot.id,
      ...trip,
      plans,
    };
  }
  
  export async function deleteSavedTrip(uid, tripId) {
    requireFirestore();
  
    if (!uid || !tripId) {
      throw new Error("A signed-in user and trip ID are required.");
    }
  
    const tripRef = doc(db, "trips", tripId);
  
    const tripSnapshot = await getDoc(tripRef);
  
    if (!tripSnapshot.exists()) {
      return;
    }
  
    if (tripSnapshot.data().ownerUid !== uid) {
      throw new Error("You do not have permission to delete this trip.");
    }
  
    const plansSnapshot = await getDocs(
      collection(db, "trips", tripId, "plans")
    );
  
    const batch = writeBatch(db);
  
    plansSnapshot.docs.forEach((planDoc) => {
      batch.delete(planDoc.ref);
    });
  
    batch.delete(tripRef);
  
    await batch.commit();
  }