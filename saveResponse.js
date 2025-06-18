import { collection, addDoc } from "firebase/firestore";
import { db } from "./app"; // adjust if your Firebase file is named differently

export async function saveApiResponse(responseData) {
  try {
    await addDoc(collection(db, "apiResponses"), {
      ...responseData,
      savedAt: new Date().toISOString(),
    });
    console.log("Saved to Firebase");
  } catch (err) {
    console.error("Error saving:", err);
  }
}
