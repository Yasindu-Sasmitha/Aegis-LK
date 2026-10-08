/**
 * Recovery & Community Relief Frontend Unit Tests
 */

export function calculateFamilyStipend(familyMembers: number, days: number, dailyRateLkr: number = 1500): number {
  if (familyMembers <= 0 || days <= 0) return 0;
  return familyMembers * days * dailyRateLkr;
}

export function requiresOfficerHumanApproval(estimatedBudgetLkr: number): boolean {
  const APPROVAL_THRESHOLD = 500000; // LKR 500,000
  return estimatedBudgetLkr > APPROVAL_THRESHOLD;
}

export function calculateShelterOccupancyPercentage(currentOccupancy: number, capacity: number): number {
  if (capacity <= 0) return 0;
  return Math.min(100, Math.round((currentOccupancy / capacity) * 100));
}

export function runRecoveryTests() {
  // Test 1: Family relief stipend calculation (Family of 4, 14 days, LKR 1500/day)
  // 4 * 14 * 1500 = 84,000
  const stipend = calculateFamilyStipend(4, 14, 1500);
  console.assert(stipend === 84000, `Stipend should be 84,000, got ${stipend}`);

  // Test 2: Zero or negative family members returns 0
  console.assert(calculateFamilyStipend(0, 14) === 0, 'Zero family size should return 0');

  // Test 3: Budget approval threshold (>500,000 LKR)
  console.assert(requiresOfficerHumanApproval(499999) === false, '499k does not require officer approval');
  console.assert(requiresOfficerHumanApproval(500001) === true, '500.001k requires officer approval');

  // Test 4: Shelter occupancy calculation
  console.assert(calculateShelterOccupancyPercentage(150, 200) === 75, '150/200 should be 75%');
  console.assert(calculateShelterOccupancyPercentage(250, 200) === 100, 'Overcapacity clamped to 100%');

  return true;
}

runRecoveryTests();
