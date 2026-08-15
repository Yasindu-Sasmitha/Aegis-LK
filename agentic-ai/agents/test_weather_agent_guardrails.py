from weather_agent import validate_and_decide

def make_state(hazards, is_landslide_prone=True):
    return {
        "district_name": "Kandy",
        "is_landslide_prone": is_landslide_prone,
        "forecast_rainfall_mm": [50.0, 55.0, 60.0],  # sum = 165mm
        "forecast_wind_kmh": [20.0, 25.0, 22.0],
        "flood_threshold_mm": 80.0,
        "landslide_threshold_mm": 100.0,
        "wind_threshold_kmh": 60.0,
        "llm_output": {"hazards": hazards},
        "hazards": [], "steps": [], "overall_status": "Success", "error": None,
    }

# Case A: model under-calls an obvious risk — 165mm is way past 1.3x the 100mm landslide threshold (130mm)
state_a = make_state([{
    "hazard_type": "Landslide", "risk_probability_pct": 20.0, "confidence_pct": 80.0,
    "reasoning_summary": "Deliberately wrong test case.", "recommended_action": "no_action"
}])
result_a = validate_and_decide(state_a)
assert result_a["hazards"][0]["recommended_action"] == "flag_for_review", "Anomaly override failed!"
print("PASS: anomaly override caught an under-called risk")

# Case B: low confidence must force review regardless of what the model recommended
state_b = make_state([{
    "hazard_type": "Flood", "risk_probability_pct": 60.0, "confidence_pct": 55.0,
    "reasoning_summary": "Deliberately low-confidence test case.", "recommended_action": "publish_alert"
}])
result_b = validate_and_decide(state_b)
assert result_b["hazards"][0]["recommended_action"] == "flag_for_review", "Confidence gate failed!"
print("PASS: low-confidence case forced to flag_for_review")

print("\nBoth guardrails verified — deterministically, no LLM call needed.")