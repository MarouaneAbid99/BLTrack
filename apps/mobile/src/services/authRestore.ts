export type RestoredAuth<T> = { token: string; user: T } | null;

export async function restoreAuthenticatedUser<T>(
  token: string | null,
  getCurrentUser: () => Promise<T>,
  clearToken: () => Promise<void>,
): Promise<RestoredAuth<T>> {
  if (!token) return null;
  try {
    return { token, user: await getCurrentUser() };
  } catch {
    await clearToken();
    return null;
  }
}
