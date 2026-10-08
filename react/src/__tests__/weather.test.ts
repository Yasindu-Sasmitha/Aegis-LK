/**
 * Weather Intelligence Frontend Unit Tests
 */

export function isRainfallWarningExceeded(rainfallMm: number, floodThresholdMm: number): boolean {
  return rainfallMm >= floodThresholdMm;
}

export function getConfidenceBadgeColor(confidencePct: number): string {
  if (confidencePct >= 80) return '#22c55e'; // High confidence - green
  if (confidencePct >= 70) return '#eab308'; // Medium - yellow
  return '#ef4444';                         // Below 70% confidence - review flag red
}

export function runWeatherTests() {
  // Test 1: Rainfall warning threshold trigger
  console.assert(isRainfallWarningExceeded(120, 100) === true, '120mm exceeds 100mm threshold');
  console.assert(isRainfallWarningExceeded(80, 100) === false, '80mm is under 100mm threshold');

  // Test 2: Confidence badge threshold 70%
  console.assert(getConfidenceBadgeColor(85) === '#22c55e', '85% confidence is green');
  console.assert(getConfidenceBadgeColor(72) === '#eab308', '72% confidence is yellow');
  console.assert(getConfidenceBadgeColor(68) === '#ef4444', '<70% confidence requires review');

  return true;
}

runWeatherTests();
