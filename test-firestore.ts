import { getFirestore } from "firebase-admin/firestore";
import admin from "firebase-admin";

admin.initializeApp({ projectId: "test" });
try {
  const db1 = getFirestore(admin.app(), "db-id");
  console.log("Success with db-id");
} catch (e) {
  console.log("Failed with db-id", e);
}
try {
  const db2 = getFirestore(admin.app());
  console.log("Success without db-id");
} catch (e) {
  console.log("Failed without db-id", e);
}
