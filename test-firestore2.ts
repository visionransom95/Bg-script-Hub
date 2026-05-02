import { getFirestore } from "firebase-admin/firestore";
import admin from "firebase-admin";

admin.initializeApp({ projectId: "test" });
try {
  const db1 = getFirestore("db-id" as any);
  console.log("Success with getFirestore(string)");
} catch (e: any) {
  console.log("Failed with string", e.message);
}
