"""
Deterministic guardrail test suite for the Weather Prediction Agent.
Tests the three core deterministic validation mechanisms in validate_and_decide:
  1. Confidence Gate: confidence < 70% forces flag_for_review
  2. Anomaly Gate: forecast >= 1.3x threshold with model no_action forces flag_for_review
  3. Critic Override Gate: Critic agent disagreement forces flag_for_review
Does NOT require an LLM call or Google API key.
"""

from weather_agent import validate_and_decide


def make_state(hazards, critique=None, rainfall=None, wind=None, is_landslide_prone=True):
    return {
        "district_id": "test-district",
        "district_name": "Kandy",
        "is_landslide_prone": is_landslide_prone,
        "forecast_rainfall_mm": rainfall if rainfall is not None else [50.0, 55.0, 60.0],  # default sum = 165mm
        "forecast_wind_kmh": wind if wind is not None else [20.0, 25.0, 22.0],            # default max = 25km/h
        "flood_threshold_mm": 80.0,
        "landslide_threshold_mm": 100.0,
        "wind_threshold_kmh": 60.0,
        "llm_output": {"hazards": hazards},
        "critique": critique,
        "hazards": [],
        "steps": [],
        "overall_status": "Success",
        "error": None,
    }


def test_confidence_gate_forces_review_when_below_70():
    """Confidence Gate: confidence < 70% must force flag_for_review."""
    state = make_state([
        {
            "hazard_type": "Flood",
            "risk_probability_pct": 80.0,
            "confidence_pct": 65.0,  # Below 70% threshold
            "reasoning_summary": "High risk predicted but model is uncertain.",
            "recommended_action": "publish_alert",
        }
    ])
    result = validate_and_decide(state)
    assert result["hazards"][0]["recommended_action"] == "flag_for_review", (
        f"Expected flag_for_review, got {result['hazards'][0]['recommended_action']}"
    )


def test_confidence_gate_preserves_action_when_at_or_above_70():
    """Confidence Gate: confidence >= 70% preserves valid recommended_action."""
    state = make_state([
        {
            "hazard_type": "Flood",
            "risk_probability_pct": 80.0,
            "confidence_pct": 70.0,  # Exactly at threshold
            "reasoning_summary": "High risk with adequate confidence.",
            "recommended_action": "publish_alert",
        }
    ])
    result = validate_and_decide(state)
    assert result["hazards"][0]["recommended_action"] == "publish_alert", (
        f"Expected publish_alert preserved, got {result['hazards'][0]['recommended_action']}"
    )


def test_anomaly_gate_overrides_undercalled_risk():
    """Anomaly Gate: forecast >= 1.3x threshold with no_action forces flag_for_review."""
    # Landslide threshold is 100mm; 1.3x is 130mm. Default rainfall sum is 165mm.
    state = make_state([
        {
            "hazard_type": "Landslide",
            "risk_probability_pct": 20.0,
            "confidence_pct": 85.0,
            "reasoning_summary": "Model incorrectly thought risk was low.",
            "recommended_action": "no_action",
        }
    ])
    result = validate_and_decide(state)
    hazard = result["hazards"][0]
    assert hazard["recommended_action"] == "flag_for_review", (
        f"Expected flag_for_review, got {hazard['recommended_action']}"
    )
    assert "[auto-flagged: forecast exceeds 1.3x threshold]" in hazard["reasoning_summary"], (
        "Expected auto-flagged note appended to reasoning_summary"
    )


def test_anomaly_gate_does_not_override_when_below_1_3x():
    """Anomaly Gate: forecast < 1.3x threshold does not force flag_for_review."""
    # Rainfall sum = 90mm, which is < 1.3x flood threshold (80 * 1.3 = 104mm)
    state = make_state(
        hazards=[{
            "hazard_type": "Flood",
            "risk_probability_pct": 30.0,
            "confidence_pct": 85.0,
            "reasoning_summary": "Rainfall moderate, within manageable levels.",
            "recommended_action": "no_action",
        }],
        rainfall=[30.0, 30.0, 30.0]
    )
    result = validate_and_decide(state)
    assert result["hazards"][0]["recommended_action"] == "no_action", (
        f"Expected no_action preserved, got {result['hazards'][0]['recommended_action']}"
    )


def test_critic_override_forces_review_when_critic_disagrees():
    """Critic Override Gate: Critic disagreement on specific hazard forces flag_for_review."""
    state = make_state(
        hazards=[{
            "hazard_type": "Flood",
            "risk_probability_pct": 80.0,
            "confidence_pct": 85.0,
            "reasoning_summary": "Heavy rain forecast indicates imminent flooding.",
            "recommended_action": "publish_alert",
        }],
        critique={
            "agrees": False,
            "concerns": [
                {
                    "hazard_type": "Flood",
                    "issue": "Risk/action mismatch: upstream dam discharge not accounted for",
                }
            ],
        },
    )
    result = validate_and_decide(state)
    hazard = result["hazards"][0]
    assert hazard["recommended_action"] == "flag_for_review", (
        f"Expected flag_for_review via critic override, got {hazard['recommended_action']}"
    )
    assert "[auto-flagged: critic agent flagged an inconsistency]" in hazard["reasoning_summary"], (
        "Expected critic inconsistency note appended to reasoning_summary"
    )
    # Check trace step summary
    last_step = result["steps"][-1]
    assert "overrode Flood due to critic disagreement" in last_step["summary"], (
        f"Expected critic override recorded in step summary, got: {last_step['summary']}"
    )


def test_critic_override_does_not_override_when_critic_agrees():
    """Critic Override Gate: Critic agreement leaves recommended_action untouched."""
    state = make_state(
        hazards=[{
            "hazard_type": "Flood",
            "risk_probability_pct": 85.0,
            "confidence_pct": 90.0,
            "reasoning_summary": "Severe rainfall forecast well supported.",
            "recommended_action": "publish_alert",
        }],
        critique={
            "agrees": True,
            "concerns": [],
        },
    )
    result = validate_and_decide(state)
    hazard = result["hazards"][0]
    assert hazard["recommended_action"] == "publish_alert", (
        f"Expected publish_alert preserved when critic agrees, got {hazard['recommended_action']}"
    )
    assert "[auto-flagged:" not in hazard["reasoning_summary"]


def test_multi_hazard_complex_guardrail_interaction():
    """Test multi-hazard interaction across all three gates simultaneously."""
    state = make_state(
        hazards=[
            {
                # Trigger Critic Override
                "hazard_type": "Flood",
                "risk_probability_pct": 85.0,
                "confidence_pct": 88.0,
                "reasoning_summary": "Flood risk assessment.",
                "recommended_action": "publish_alert",
            },
            {
                # Trigger Anomaly Gate (165mm >= 130mm landslide threshold, model under-called no_action)
                "hazard_type": "Landslide",
                "risk_probability_pct": 25.0,
                "confidence_pct": 80.0,
                "reasoning_summary": "Landslide assessment under-called.",
                "recommended_action": "no_action",
            },
            {
                # Normal calm condition, preserves no_action
                "hazard_type": "StrongWind",
                "risk_probability_pct": 15.0,
                "confidence_pct": 92.0,
                "reasoning_summary": "Wind speeds well within safe limits.",
                "recommended_action": "no_action",
            },
        ],
        critique={
            "agrees": False,
            "concerns": [
                {
                    "hazard_type": "Flood",
                    "issue": "Forecast discrepancy with regional river gauge baseline",
                }
            ],
        },
        rainfall=[50.0, 55.0, 60.0],  # 165mm
        wind=[15.0, 18.0, 20.0],      # max 20km/h (safe)
    )

    result = validate_and_decide(state)
    hazards_by_type = {h["hazard_type"]: h for h in result["hazards"]}

    # 1. Flood: caught by critic override
    assert hazards_by_type["Flood"]["recommended_action"] == "flag_for_review"
    assert "[auto-flagged: critic agent flagged an inconsistency]" in hazards_by_type["Flood"]["reasoning_summary"]

    # 2. Landslide: caught by anomaly gate
    assert hazards_by_type["Landslide"]["recommended_action"] == "flag_for_review"
    assert "[auto-flagged: forecast exceeds 1.3x threshold]" in hazards_by_type["Landslide"]["reasoning_summary"]

    # 3. StrongWind: remained no_action
    assert hazards_by_type["StrongWind"]["recommended_action"] == "no_action"
    assert "[auto-flagged:" not in hazards_by_type["StrongWind"]["reasoning_summary"]


if __name__ == "__main__":
    test_confidence_gate_forces_review_when_below_70()
    print("PASS: Confidence Gate (< 70% forces flag_for_review)")

    test_confidence_gate_preserves_action_when_at_or_above_70()
    print("PASS: Confidence Gate (>= 70% preserves valid action)")

    test_anomaly_gate_overrides_undercalled_risk()
    print("PASS: Anomaly Gate (forecast >= 1.3x threshold overrides under-called no_action)")

    test_anomaly_gate_does_not_override_when_below_1_3x()
    print("PASS: Anomaly Gate (< 1.3x threshold preserves no_action)")

    test_critic_override_forces_review_when_critic_disagrees()
    print("PASS: Critic Override Gate (critic disagreement forces flag_for_review)")

    test_critic_override_does_not_override_when_critic_agrees()
    print("PASS: Critic Override Gate (critic agreement leaves action intact)")

    test_multi_hazard_complex_guardrail_interaction()
    print("PASS: Multi-Hazard Complex Interaction (all 3 gates tested concurrently)")

    print("\nALL GUARDRAILS PASSED (Confidence Gate, Anomaly Gate, Critic Override) — 100% deterministic, 0 LLM calls.")