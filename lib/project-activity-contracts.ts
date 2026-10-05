import type { ActivityContract } from './project-activity';

// Only add business contracts after verifying their role in a project's official
// deployment documentation. Never copy the project's token address into this map.
// Each entry needs a human-readable role and a public attribution source.
// Maximum three contracts per project; this is an explicitly bounded coverage set.
export const projectActivityContracts: Record<string, ActivityContract[]> = {
  arclight: [
    { address:'0x24A8653006a443aDa62d5001B53a958850acd844', label:'arclUSDC Vault', sourceUrl:'https://arclight.finance/docs/arclusdc' },
  ],
  foci: [
    { address:'0xa392D6eca5242715517eeCd43406aeD19424FAC0', label:'FociLaunchFactory', sourceUrl:'https://foci.family/documentation/abi' },
    { address:'0x5C5c202271E1300bD5Ce43A4F5C1cEA8efd57B63', label:'FociLaunchAndBuy', sourceUrl:'https://foci.family/documentation/abi' },
  ],
};
