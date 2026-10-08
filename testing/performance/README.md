# Aegis-LK Performance Tests (k6)

This directory contains the Grafana k6 performance test suite for the Aegis-LK backend API.

## Prerequisites

- [k6](https://k6.io/docs/get-started/installation/) v0.50+ installed and on PATH
- Aegis-LK backend running locally on `http://127.0.0.1:5012`

## Quick Start

```bash
# Smoke test (1 VU, 10 iterations — verifies all endpoints respond)
k6 run testing/performance/k6_perf_test.js --env SCENARIO=smoke

# Public endpoint load test (no auth)
k6 run testing/performance/k6_perf_test.js --env SCENARIO=public_load

# Authenticated officer workflow
k6 run testing/performance/k6_perf_test.js \
    --env SCENARIO=auth_workflow \
    --env OFFICER_EMAIL=officer@aegis.lk \
    --env OFFICER_PASSWORD=Aegis@123

# Citizen registration burst
k6 run testing/performance/k6_perf_test.js --env SCENARIO=citizen_burst

# Full suite (all scenarios)
k6 run testing/performance/k6_perf_test.js \
    --env OFFICER_EMAIL=officer@aegis.lk \
    --env OFFICER_PASSWORD=Aegis@123
```

## Scenarios

| Scenario | VUs | Duration | Purpose |
|---|---|---|---|
| `smoke` | 1 | ~30 s | Sanity-check every endpoint responds correctly |
| `public_load` | 0→10→0 | 50 s | Load test unauthenticated endpoints |
| `auth_workflow` | 5 | 30 s | Authenticated officer read workflow |
| `citizen_burst` | 10 | ≤60 s | Registration / login spike load |

## SLO Thresholds

| Metric | Threshold |
|---|---|
| P95 response time (all requests) | < 1000 ms |
| Global HTTP error rate | < 2 % |
| Health endpoint P95 latency | < 200 ms |
| Auth error rate | < 2 % |
| Incident endpoint error rate | < 5 % |

k6 exits with code **0** when all thresholds pass, **non-zero** if any threshold is breached — making it safe to integrate into CI pipelines.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `BASE_URL` | `http://127.0.0.1:5012` | Backend base URL |
| `SCENARIO` | `all` | Which scenario to run |
| `OFFICER_EMAIL` | `officer@aegis.lk` | Officer credentials for auth scenario |
| `OFFICER_PASSWORD` | `Aegis@123` | Officer password |

## CI Integration

In CI, provide the officer credentials as secrets:

```yaml
- name: Run k6 performance tests
  run: |
    k6 run testing/performance/k6_perf_test.js \
        --env SCENARIO=smoke \
        --env BASE_URL=${{ env.API_BASE_URL }}
```
