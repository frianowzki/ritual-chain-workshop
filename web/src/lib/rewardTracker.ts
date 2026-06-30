"use client";

/**
 * LocalStorage-based reward tracking for bounties.
 * Since Ritual Chain RPC doesn't support eth_getLogs, we store
 * reward amounts when bounties are created so we can display them later.
 */

const REWARDS_KEY = "ritual_bounty_rewards";

export function getStoredRewards(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(REWARDS_KEY) || "{}");
  } catch {
    return {};
  }
}

export function storeBountyReward(bountyId: number, rewardWei: bigint) {
  if (typeof window === "undefined") return;
  const rewards = getStoredRewards();
  rewards[String(bountyId)] = rewardWei.toString();
  localStorage.setItem(REWARDS_KEY, JSON.stringify(rewards));
}
