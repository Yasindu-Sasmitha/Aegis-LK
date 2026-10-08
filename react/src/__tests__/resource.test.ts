/**
 * Resource & Inventory Logistics Frontend Unit Tests
 */

export interface InventoryItemState {
  id: string;
  itemName: string;
  quantity: number;
  reorderThreshold: number;
}

export function checkIsLowStock(quantity: number, threshold: number): boolean {
  return quantity <= threshold;
}

export function calculateHaversineDistanceKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export function runResourceTests() {
  // Test 1: Low stock threshold check
  console.assert(checkIsLowStock(10, 20) === true, '10 <= 20 should trigger low stock alert');
  console.assert(checkIsLowStock(25, 20) === false, '25 > 20 should be normal stock');

  // Test 2: Distance between Colombo (6.9271, 79.8612) and Gampaha (7.0917, 79.9997) ~23.5 km
  const distance = calculateHaversineDistanceKm(6.9271, 79.8612, 7.0917, 79.9997);
  console.assert(distance > 20 && distance < 26, `Distance should be ~23km, got ${distance}`);

  return true;
}

runResourceTests();
