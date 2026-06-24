import type { Address } from "viem";

/**
 * Central place for the on-chain config the UI needs.
 * Everything is read from `NEXT_PUBLIC_*` env vars so the same build can be
 * pointed at different Ritual deployments without code changes.
 */

const rawAddress = process.env.NEXT_PUBLIC_CR_CONTRACT_ADDRESS?.trim();

/** Deployed CommitRevealBounty address, or `undefined` if not configured. */
export const crContractAddress: Address | undefined =
  rawAddress && /^0x[0-9a-fA-F]{40}$/.test(rawAddress)
    ? (rawAddress as Address)
    : undefined;

/** True when the contract address env var is present and well-formed. */
export const isCRContractConfigured = Boolean(crContractAddress);

/** Ritual LLM executor / callback address used when encoding `judgeAll` input. */
export const executorAddress: Address =
  (process.env.NEXT_PUBLIC_RITUAL_EXECUTOR_ADDRESS?.trim() as Address | undefined) ??
  "0x0000000000000000000000000000000000000802";

export const ritualChainId = Number(
  process.env.NEXT_PUBLIC_RITUAL_CHAIN_ID ?? "1979",
);

export const ritualRpcUrl =
  process.env.NEXT_PUBLIC_RITUAL_RPC_URL ?? "https://rpc.ritualfoundation.org";
