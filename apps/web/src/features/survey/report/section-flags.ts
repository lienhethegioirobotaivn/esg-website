import type { ReportModel } from "@esg/shared";

/** True when at least one part carries content (used to decide whether a topic page exists). */
export function has(...parts: readonly unknown[]): boolean {
  return parts.some((part) => part !== null && part !== undefined && part !== false && part !== "");
}

/** Which optional topics have content. Shared by the PDF and Word exports so both show the same sections. */
export function sectionFlags(model: ReportModel) {
  const { profile, environment, social, governance, improvement, charts } = model;
  const hasEnergy = has(environment.electricity, environment.fuel, environment.energy.items.length > 0, environment.energy.assessment);
  const hasGhg = has(environment.scope1, environment.scope2, environment.climate.items.length > 0);
  const hasWater = has(environment.water, environment.wastewater, environment.waterSection.items.length > 0, environment.waterSection.assessment);
  const hasWaste = has(environment.wasteNonHazardous, environment.wasteHazardous, environment.waste.items.length > 0, environment.waste.assessment);
  const hasMaterials = environment.materials.items.length > 0;
  const hasIncident = has(environment.incident, environment.targets.items.length > 0, environment.targets.assessment);
  const hasValueChain = has(profile.products, profile.markets, profile.revenueBand, charts.supplyChain);
  const hasWorkforce = has(social.headcount, social.workerScope, social.workforceTable, social.workforce.items.length > 0, social.workforce.assessment);
  const hasSafety = has(social.accidents, social.fatalities, social.safety.items.length > 0, social.safety.assessment);
  const hasLabour = has(social.labour.items.length > 0, social.labour.assessment);
  const hasCommunity = has(social.trainingHours, social.community.items.length > 0, social.community.assessment);
  const hasGovernance = has(governance.esgRole, governance.leadershipReview, governance.priorities, governance.coordination.items.length > 0, governance.coordination.assessment);
  const hasIntegrity = has(governance.integrityIncident, governance.integrity.items.length > 0, governance.integrity.assessment);
  const hasSupply = has(governance.supply.items.length > 0, governance.supply.assessment, profile.supplierGroups.length > 0);
  const hasData = has(governance.data.items.length > 0, governance.data.assessment);
  const hasGaps = has(improvement.gaps.length > 0, improvement.followups, improvement.focus);
  const hasPlan = has(improvement.actions.length > 0, improvement.goal, improvement.resources, improvement.reviewCycle);
  const hasActions = has(hasPlan, improvement.suggestions.length > 0);
  return {
    hasEnergy, hasGhg, hasWater, hasWaste, hasMaterials, hasIncident, hasValueChain,
    hasWorkforce, hasSafety, hasLabour, hasCommunity, hasGovernance, hasIntegrity,
    hasSupply, hasData, hasGaps, hasPlan, hasActions,
  };
}
