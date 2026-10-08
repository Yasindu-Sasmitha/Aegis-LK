/**
 * Incident Management Frontend Unit Tests
 */

export interface IncidentSummary {
  id: string;
  disasterType: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Reported' | 'Verified' | 'OnHold' | 'Rejected' | 'Resolved';
  isDuplicate: boolean;
}

export function getIncidentSeverityBadgeColor(severity: string): string {
  switch (severity) {
    case 'Critical': return '#ef4444'; // Red
    case 'High': return '#f97316';     // Orange
    case 'Medium': return '#eab308';   // Yellow
    case 'Low': return '#22c55e';      // Green
    default: return '#6b7280';        // Gray
  }
}

export function filterPrimaryIncidents(incidents: IncidentSummary[]): IncidentSummary[] {
  return incidents.filter(i => !i.isDuplicate);
}

export function runIncidentTests() {
  // Test 1: Badge color for Critical
  console.assert(getIncidentSeverityBadgeColor('Critical') === '#ef4444', 'Critical badge must be red');

  // Test 2: Badge color for Low
  console.assert(getIncidentSeverityBadgeColor('Low') === '#22c55e', 'Low badge must be green');

  // Test 3: Linked duplicate filtering
  const incidents: IncidentSummary[] = [
    { id: '1', disasterType: 'Flood', severity: 'High', status: 'Reported', isDuplicate: false },
    { id: '2', disasterType: 'Flood', severity: 'High', status: 'Reported', isDuplicate: true },
    { id: '3', disasterType: 'Landslide', severity: 'Critical', status: 'Verified', isDuplicate: false }
  ];

  const primaries = filterPrimaryIncidents(incidents);
  console.assert(primaries.length === 2, 'Should hide duplicates from primary triage');
  console.assert(!primaries.some(i => i.isDuplicate), 'No duplicates in primary list');

  return true;
}

runIncidentTests();
