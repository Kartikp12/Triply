import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function readServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not configured.");
  }

  let serviceAccount;

  try {
    serviceAccount = JSON.parse(raw);
  } catch {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON must contain valid service-account JSON."
    );
  }

  if (
    !serviceAccount.project_id ||
    !serviceAccount.client_email ||
    !serviceAccount.private_key
  ) {
    throw new Error(
      "The Firebase service-account JSON is missing required credentials."
    );
  }

  return {
    ...serviceAccount,
    private_key: serviceAccount.private_key.replace(/\\n/g, "\n"),
  };
}

export function getFirebaseAdmin() {
  const serviceAccount = readServiceAccount();
  const existingApp = getApps().find(
    (candidate) => candidate.name === "triply-admin"
  );

  const app =
    existingApp ||
    initializeApp(
      {
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id,
      },
      "triply-admin"
    );

  return {
    auth: getAuth(app),
    db: getFirestore(app),
  };
}