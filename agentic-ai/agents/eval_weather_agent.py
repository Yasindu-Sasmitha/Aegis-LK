"""
Golden-case evaluation for the Weather Prediction Agent — runs the REAL agent
(real Gemini calls) against known scenarios and reports a pass/fail count
with a denominator, per Lab 07's evaluation philosophy.
"""
from weather_agent import weather_agent

CASES = [
    {
        "id": "kandy-severe-flood-and-landslide",
        "state": {
            "district_id": "eval", "district_name": "Kandy", "is_landslide_prone": True,
            "forecast_rainfall_mm": [90.0, 95.0, 100.0], "forecast_wind_kmh": [20.0, 22.0, 21.0],
            "flood_threshold_mm": 80.0, "landslide_threshold_mm": 100.0, "wind_threshold_kmh": 60.0,
            "llm_output": None, "hazards": [], "steps": [], "overall_status": "Success", "error": None,
        },
        "expect": {"hazard_count": 3, "not_action": {"Flood": "no_action", "Landslide": "no_action"}},
    },
    {
        "id": "jaffna-calm-no-landslide-hazard",
        "state": {
            "district_id": "eval", "district_name": "Jaffna", "is_landslide_prone": False,
            "forecast_rainfall_mm": [2.0, 1.0, 3.0], "forecast_wind_kmh": [15.0, 18.0, 12.0],
            "flood_threshold_mm": 60.0, "landslide_threshold_mm": None, "wind_threshold_kmh": 60.0,
            "llm_output": None, "hazards": [], "steps": [], "overall_status": "Success", "error": None,
        },
        "expect": {"hazard_count": 2, "no_landslide_key": True},
    },
    {
        "id": "trincomalee-severe-wind-only",
        "state": {
            "district_id": "eval", "district_name": "Trincomalee", "is_landslide_prone": False,
            "forecast_rainfall_mm": [5.0, 4.0, 6.0], "forecast_wind_kmh": [95.0, 88.0, 90.0],
            "flood_threshold_mm": 72.0, "landslide_threshold_mm": None, "wind_threshold_kmh": 60.0,
            "llm_output": None, "hazards": [], "steps": [], "overall_status": "Success", "error": None,
        },
        "expect": {"hazard_count": 2, "not_action": {"StrongWind": "no_action"}},
    },
    {
        "id": "ratnapura-calm-hill-district",
        "state": {
            "district_id": "eval", "district_name": "Ratnapura", "is_landslide_prone": True,
            "forecast_rainfall_mm": [10.0, 8.0, 12.0], "forecast_wind_kmh": [18.0, 20.0, 15.0],
            "flood_threshold_mm": 110.0, "landslide_threshold_mm": 100.0, "wind_threshold_kmh": 60.0,
            "llm_output": None, "hazards": [], "steps": [], "overall_status": "Success", "error": None,
        },
        "expect": {"hazard_count": 3, "all_no_action": True},
    },
]


def run_case(case: dict) -> tuple[bool, list[str]]:
    failures = []
    result = weather_agent.invoke(case["state"])

    if result.get("overall_status") != "Success":
        return False, [f"agent failed: {result.get('error')}"]

    hazards = {h["hazard_type"]: h for h in result["hazards"]}
    expect = case["expect"]

    if "hazard_count" in expect and len(hazards) != expect["hazard_count"]:
        failures.append(f"expected {expect['hazard_count']} hazards, got {len(hazards)}: {list(hazards)}")

    if expect.get("no_landslide_key") and "Landslide" in hazards:
        failures.append("Landslide assessed for a non-landslide-prone district")

    if expect.get("all_no_action"):
        for name, h in hazards.items():
            if h["recommended_action"] != "no_action":
                failures.append(f"{name} expected no_action, got {h['recommended_action']}")

    for name, not_action in expect.get("not_action", {}).items():
        if name in hazards and hazards[name]["recommended_action"] == not_action:
            failures.append(f"{name} should NOT be '{not_action}' here — model likely under-called the risk")

    return len(failures) == 0, failures


if __name__ == "__main__":
    rows = []
    for case in CASES:
        passed, failures = run_case(case)
        rows.append((case["id"], passed))
        print(f"{'PASS' if passed else 'FAIL'}  {case['id']}")
        for f in failures:
            print(f"       - {f}")

    passed_count = sum(1 for _, p in rows if p)
    print(f"\nRESULT: {passed_count}/{len(rows)} cases passed")