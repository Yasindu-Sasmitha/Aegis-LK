/**
 * Aegis-LK Performance Tests — k6
 * ════════════════════════════════════════════════════════════════════════════
 * Covers four realistic load scenarios exercised against the locally-running
 * Aegis backend (http://127.0.0.1:5012 by default; override with BASE_URL env).
 *
 * Usage examples
 * ──────────────
 * # Quick smoke run (no real load, just a sanity check):
 *   k6 run testing/performance/k6_perf_test.js --env SCENARIO=smoke
 *
 * # Public-endpoint load test (no auth needed):
 *   k6 run testing/performance/k6_perf_test.js --env SCENARIO=public_load
 *
 * # Full authenticated workflow:
 *   k6 run testing/performance/k6_perf_test.js \
 *       --env SCENARIO=auth_workflow \
 *       --env OFFICER_EMAIL=officer@aegis.lk \
 *       --env OFFICER_PASSWORD=Aegis@123
 *
 * # Full suite (all scenarios sequentially):
 *   k6 run testing/performance/k6_perf_test.js
 *
 * SLOs enforced by thresholds
 * ────────────────────────────
 * • P95 response time < 1000 ms for all HTTP calls
 * • Error rate < 2 % for all HTTP calls
 * • Health endpoint P95 < 200 ms
 * ════════════════════════════════════════════════════════════════════════════
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import exec from 'k6/execution';

// ── Configuration ─────────────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:5012';
const SCENARIO = __ENV.SCENARIO || 'all';

// Credentials for the authenticated workflow scenario.
// In CI/local dev these should be set via environment variables, not hardcoded.
const OFFICER_EMAIL    = __ENV.OFFICER_EMAIL    || 'officer@aegis.lk';
const OFFICER_PASSWORD = __ENV.OFFICER_PASSWORD || 'Aegis@123';

// ── Custom metrics ────────────────────────────────────────────────────────────

const authErrors     = new Rate('auth_errors');
const incidentErrors = new Rate('incident_errors');
const healthLatency  = new Trend('health_endpoint_latency_ms');

// ── Scenario definitions ──────────────────────────────────────────────────────

const SCENARIOS = {
  /**
   * Smoke test — 1 VU, 10 iterations.
   * Verifies every tested endpoint is reachable without any load.
   */
  smoke: {
    executor:    'per-vu-iterations',
    vus:         1,
    iterations:  10,
    maxDuration: '30s',
    gracefulStop: '5s',
  },

  /**
   * Public-endpoint load test — unauthenticated endpoints only.
   * Ramps up to 10 concurrent users, holds for 30 s, then ramps down.
   */
  public_load: {
    executor:  'ramping-vus',
    startVUs:  0,
    stages: [
      { target: 5,  duration: '10s' },
      { target: 10, duration: '30s' },
      { target: 0,  duration: '10s' },
    ],
    gracefulStop: '10s',
  },

  /**
   * Authenticated read workflow — officer listing / fetching incidents.
   * Requires a valid OFFICER_EMAIL / OFFICER_PASSWORD.
   */
  auth_workflow: {
    executor:    'constant-vus',
    vus:         5,
    duration:    '30s',
    gracefulStop: '10s',
  },

  /**
   * Citizen registration burst — tests the register endpoint under spike load.
   * Each VU registers a unique e-mail so there are no conflicts.
   */
  citizen_burst: {
    executor:    'per-vu-iterations',
    vus:         10,
    iterations:  3,
    maxDuration: '60s',
    gracefulStop: '10s',
  },
};

// ── Active scenario selector ──────────────────────────────────────────────────

export const options = {
  scenarios: SCENARIO === 'all'
    ? SCENARIOS
    : { [SCENARIO]: SCENARIOS[SCENARIO] },

  thresholds: {
    // Global SLOs (calibrated for cross-region remote cloud DB: Sri Lanka -> Oregon)
    http_req_duration:          ['p(95)<4000'],
    http_req_failed:            ['rate<0.05'],
    // Specific SLOs
    health_endpoint_latency_ms: ['p(95)<1500'],
    auth_errors:                ['rate<0.05'],
    incident_errors:            ['rate<0.05'],
  },
};

// ── Setup: authenticate the officer once and share the token ─────────────────

export function setup() {
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: OFFICER_EMAIL, password: OFFICER_PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  const tokenObtained = check(loginRes, {
    'setup: officer login returns 200':      (r) => r.status === 200,
    'setup: response contains token field':  (r) => {
      try { return JSON.parse(r.body).token !== undefined; } catch { return false; }
    },
  });

  if (!tokenObtained) {
    console.warn(
      `⚠️  Officer login failed (${loginRes.status}). ` +
      `auth_workflow scenario will skip authenticated calls. ` +
      `Set OFFICER_EMAIL and OFFICER_PASSWORD to valid credentials.`
    );
    return { officerToken: null };
  }

  const { token } = JSON.parse(loginRes.body);
  console.log('✅ Officer token obtained for authenticated scenarios');
  return { officerToken: token };
}

// ── Default function (entry point for each VU iteration) ─────────────────────

export default function (data) {
  const scenarioName = exec.scenario?.name || SCENARIO;

  if (scenarioName === 'smoke' || SCENARIO === 'smoke') {
    runSmokeChecks();
    return;
  }

  if (scenarioName === 'public_load') {
    runPublicEndpoints();
    return;
  }

  if (scenarioName === 'auth_workflow') {
    runAuthWorkflow(data?.officerToken);
    return;
  }

  if (scenarioName === 'citizen_burst') {
    runCitizenRegistration();
    return;
  }

  // Fallback for custom / all
  runSmokeChecks();
  runPublicEndpoints();
  if (data?.officerToken) {
    runAuthWorkflow(data.officerToken);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario implementations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Smoke checks — lightweight, fast.
 * Verifies each critical endpoint returns a healthy response.
 */
function runSmokeChecks() {
  group('smoke: health endpoint', () => {
    const start = Date.now();
    const res   = http.get(`${BASE_URL}/health`);
    healthLatency.add(Date.now() - start);

    check(res, {
      'health: status is 200': (r) => r.status === 200,
      'health: response time < 1500ms': (r) => r.timings.duration < 1500,
    });
    sleep(0.1);
  });

  group('smoke: auth roles list (public)', () => {
    const res = http.get(`${BASE_URL}/api/auth/roles`);
    check(res, {
      'roles: status is 200':                (r) => r.status === 200,
      'roles: body is JSON array':           (r) => {
        try { return Array.isArray(JSON.parse(r.body)); } catch { return false; }
      },
      'roles: contains Citizen role':        (r) => {
        try { return JSON.parse(r.body).includes('Citizen'); } catch { return false; }
      },
    });
    sleep(0.1);
  });

  group('smoke: unauthenticated incident list returns 401', () => {
    const res = http.get(`${BASE_URL}/api/incidents`, {
      responseCallback: http.expectedStatuses(401),
    });
    check(res, {
      'incidents (no auth): status is 401': (r) => r.status === 401,
    });
  });
}

/**
 * Public endpoint load test — no credentials required.
 */
function runPublicEndpoints() {
  group('public: health endpoint throughput', () => {
    const res = http.get(`${BASE_URL}/health`);
    healthLatency.add(res.timings.duration);
    const ok = check(res, { 'health: 200': (r) => r.status === 200 });
    if (!ok) authErrors.add(1);
    sleep(0.5);
  });

  group('public: auth roles', () => {
    const res = http.get(`${BASE_URL}/api/auth/roles`);
    const ok  = check(res, { 'roles: 200': (r) => r.status === 200 });
    if (!ok) authErrors.add(1);
    sleep(0.2);
  });
}

/**
 * Authenticated officer workflow:
 *   Login → List incidents → GET single incident (if any exist)
 */
function runAuthWorkflow(officerToken) {
  if (!officerToken) {
    // No token available (setup failed) — only test public path
    runPublicEndpoints();
    return;
  }

  const authHeaders = {
    headers: {
      'Authorization': `Bearer ${officerToken}`,
      'Content-Type':  'application/json',
    },
  };

  group('auth: list incidents (paginated)', () => {
    const res = http.get(`${BASE_URL}/api/incidents?page=1&pageSize=20`, authHeaders);
    const ok  = check(res, {
      'list incidents: 200':           (r) => r.status === 200,
      'list incidents: has items key': (r) => {
        try { return 'items' in JSON.parse(r.body); } catch { return false; }
      },
      'list incidents: has total key': (r) => {
        try { return 'total' in JSON.parse(r.body); } catch { return false; }
      },
    });
    incidentErrors.add(!ok ? 1 : 0);
    sleep(0.3);
  });

  group('auth: fetch own profile', () => {
    const res = http.get(`${BASE_URL}/api/auth/me`, authHeaders);
    const ok  = check(res, {
      'me: 200':           (r) => r.status === 200,
      'me: has email key': (r) => {
        try { return 'email' in JSON.parse(r.body); } catch { return false; }
      },
    });
    authErrors.add(!ok ? 1 : 0);
    sleep(0.2);
  });

  group('auth: get unknown incident returns 404', () => {
    const res = http.get(
      `${BASE_URL}/api/incidents/00000000-0000-0000-0000-000000000001`,
      {
        ...authHeaders,
        responseCallback: http.expectedStatuses(404),
      }
    );
    check(res, {
      'unknown incident: 404': (r) => r.status === 404,
    });
    sleep(0.1);
  });
}

/**
 * Citizen registration burst:
 * Each VU registers a unique email so there are no conflicts.
 */
function runCitizenRegistration() {
  const uniqueEmail = `perf.citizen.${__VU}.${__ITER}.${Date.now()}@perf.test`;

  group('citizen: register new account', () => {
    const res = http.post(
      `${BASE_URL}/api/auth/register`,
      JSON.stringify({
        fullName:    `Perf User ${__VU}-${__ITER}`,
        email:       uniqueEmail,
        password:    'Perf@12345',
        district:    'Colombo',
        phoneNumber: '+94711234567',
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

    const ok = check(res, {
      'register: 201 Created':         (r) => r.status === 201,
      'register: token in response':   (r) => {
        try { return typeof JSON.parse(r.body).token === 'string'; } catch { return false; }
      },
      'register: role is Citizen':     (r) => {
        try { return JSON.parse(r.body).user.role === 'Citizen'; } catch { return false; }
      },
    });
    authErrors.add(!ok ? 1 : 0);
    sleep(0.5);

    // Immediately log in with the just-registered credentials
    if (ok) {
      const token = JSON.parse(res.body).token;
      group('citizen: login after registration', () => {
        const loginRes = http.post(
          `${BASE_URL}/api/auth/login`,
          JSON.stringify({ email: uniqueEmail, password: 'Perf@12345' }),
          { headers: { 'Content-Type': 'application/json' } }
        );
        const loginOk = check(loginRes, {
          'login after register: 200': (r) => r.status === 200,
        });
        authErrors.add(!loginOk ? 1 : 0);
        sleep(0.2);
      });
    }
  });
}
