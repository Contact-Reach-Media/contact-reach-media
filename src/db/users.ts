import { db } from './index.ts';
import { users } from './schema.ts';

export async function getOrCreateUser(uid: string, email: string, name?: string, phone?: string) {
  try {
    const result = await db.insert(users)
      .values({
        uid,
        email,
        name: name || null,
        phone: phone || null,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          ...(name ? { name } : {}),
          ...(phone ? { phone } : {}),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Error synchronizing user to PostgreSQL database:', error);
    throw new Error('Database user sync failed.', { cause: error });
  }
}
