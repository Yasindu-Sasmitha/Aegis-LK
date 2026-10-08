/**
 * Authentication & RBAC Frontend Unit Tests
 */

export interface UserSession {
  userId: string;
  email: string;
  role: 'Admin' | 'DisasterOfficer' | 'Responder' | 'Citizen';
}

export function canAccessRoute(role: string, allowedRoles: string[]): boolean {
  if (allowedRoles.includes('*')) return true;
  return allowedRoles.includes(role);
}

export function parseJwtRole(tokenPayload: { role?: string; 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'?: string }): string {
  return tokenPayload.role || tokenPayload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || 'Citizen';
}

// Inline assertion runner for TypeScript build & test verification
export function runAuthTests() {
  // Test 1: Admin has full access to admin route
  console.assert(canAccessRoute('Admin', ['Admin']), 'Admin should access Admin route');

  // Test 2: Citizen blocked from officer routes
  console.assert(!canAccessRoute('Citizen', ['DisasterOfficer', 'Admin']), 'Citizen should be blocked from staff routes');

  // Test 3: Public route allows any role
  console.assert(canAccessRoute('Citizen', ['*']), 'Public route should allow Citizen');

  // Test 4: Parse role from standard JWT claim
  const standardPayload = { role: 'DisasterOfficer' };
  console.assert(parseJwtRole(standardPayload) === 'DisasterOfficer', 'Should parse standard role');

  // Test 5: Parse role from Microsoft schema claim
  const msPayload = { 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': 'Admin' };
  console.assert(parseJwtRole(msPayload) === 'Admin', 'Should parse MS schema role');

  return true;
}

runAuthTests();
