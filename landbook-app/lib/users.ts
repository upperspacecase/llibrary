import { getCollection } from "@/lib/db";
import type { CurrentUser } from "@/lib/firebase/admin";
import type { User } from "@/lib/types";

/** Upsert the signed-in agent into the `users` collection so signups show up
 *  in the admin console even before they create a LandBook. Keyed on the
 *  Firebase uid; refreshes profile fields and lastSeenAt on every call. */
export async function recordUser(user: CurrentUser): Promise<void> {
  const now = new Date().toISOString();
  const users = await getCollection<User>("users");
  await users.updateOne(
    { uid: user.uid },
    {
      $set: {
        email: user.email,
        name: user.name,
        picture: user.picture,
        lastSeenAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );
}
