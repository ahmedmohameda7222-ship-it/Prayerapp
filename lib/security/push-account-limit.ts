export const MAX_ACCOUNT_PUSH_SUBSCRIPTIONS = 10;

export function limitAccountAssociatedSubscriptions<T extends { user_id?: string | null }>(
  subscriptions: readonly T[],
): T[] {
  const accountCounts = new Map<string, number>();

  return subscriptions.filter((subscription) => {
    const userId = subscription.user_id;
    if (!userId) return true;

    const current = accountCounts.get(userId) ?? 0;
    if (current >= MAX_ACCOUNT_PUSH_SUBSCRIPTIONS) return false;

    accountCounts.set(userId, current + 1);
    return true;
  });
}
