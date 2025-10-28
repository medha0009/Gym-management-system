// helpers.js
import { auth, db } from "./firebase-config.js";

export function toCsv(rows, header) {
  const cols = header.join(",");
  const lines = rows.map(r => header.map(h => `"${(r[h] ?? "").toString().replace(/"/g,'""')}"`).join(","));
  return [cols, ...lines].join("\n");
}

export async function writeLog(action, details = {}) {
  try {
    const uid = auth.currentUser?.uid || null;
    await db.collection("logs").add({
      uid,
      action,
      details,
      ts: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) {
    console.error("log error:", e);
  }
}
