import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("CommitRevealBountyModule", (m) => {
  const crBounty = m.contract("CommitRevealBounty");

  return { crBounty };
});
