"""
simulator.py — Scenario Simulation Engine.

"What if" analysis for policy interventions.
Takes intervention parameters and computes projected AQI impact
using source-attribution weights.
"""

import logging
from datetime import datetime
from typing import Dict, List, Optional

import numpy as np

from backend.data_service import data_service
from backend.source_attribution import compute_source_attribution, ZONE_SOURCE_MIX

logger = logging.getLogger(__name__)


# ── Intervention Impact Coefficients ────────────────────────────────────────
# How much each 1% intervention in a source reduces AQI

INTERVENTION_IMPACT = {
    "traffic": 0.45,       # 1% traffic reduction → 0.45% AQI reduction
    "industry": 0.55,      # Industrial has stronger per-unit impact
    "construction": 0.35,  # Construction contributes less to overall AQI
    "waste_burning": 0.40,
    "dust_natural": 0.10,  # Can't really control natural dust much
}

# Response time: days for intervention to take effect
RESPONSE_DELAY = {
    "traffic": 1,       # Traffic measures show next-day impact
    "industry": 2,      # Industry shutdown takes 1-2 days to fully reflect
    "construction": 1,  # Immediate for dust suppression
}


def run_simulation(
    city: str,
    traffic_reduction: float = 0,
    industry_shutdown: float = 0,
    construction_halt: float = 0,
    simulation_days: int = 7,
) -> Dict:
    """
    Run a "what-if" scenario simulation.
    
    Args:
        city: Target city name
        traffic_reduction: 0-100 percent reduction in vehicular traffic
        industry_shutdown: 0-100 percent of industrial units shut down
        construction_halt: 0-100 percent of construction sites halted
        simulation_days: Number of days to simulate (default 7)
    
    Returns:
        Dict with baseline vs simulated AQI trends, impact metrics,
        and AI-generated policy summary.
    """
    # Get current city data
    summary = data_service.get_city_summary(city)
    current_aqi = summary.get("avg_aqi") or 150
    
    # Clamp inputs
    traffic_reduction = max(0, min(100, traffic_reduction))
    industry_shutdown = max(0, min(100, industry_shutdown))
    construction_halt = max(0, min(100, construction_halt))
    
    # Compute intervention impact
    interventions = {
        "traffic": traffic_reduction,
        "industry": industry_shutdown,
        "construction": construction_halt,
    }
    
    # Get average source attribution for the city (across all zones)
    avg_mix = _get_city_avg_source_mix(city)
    
    # Compute total AQI reduction potential
    total_reduction_pct = 0
    source_impact_details = []
    
    for source, intervention_pct in interventions.items():
        if intervention_pct == 0:
            continue
        
        source_contribution = avg_mix.get(source, 0)
        impact_coeff = INTERVENTION_IMPACT.get(source, 0.3)
        
        # Effective reduction = intervention% × source_contribution% × impact_coefficient
        effective_reduction = (intervention_pct / 100) * source_contribution * impact_coeff
        total_reduction_pct += effective_reduction
        
        source_impact_details.append({
            "source": source.replace("_", " ").title(),
            "intervention_pct": intervention_pct,
            "source_contribution_pct": round(source_contribution * 100, 1),
            "aqi_reduction_pct": round(effective_reduction * 100, 1),
        })
    
    # Generate day-by-day trend
    trend = []
    for day in range(simulation_days):
        day_label = f"Day {day + 1}"
        
        # Baseline: slight natural variation with upward drift
        np.random.seed(hash(f"{city}_{day}") % 2**31)
        daily_variation = np.random.normal(0, 3)
        baseline = current_aqi + daily_variation + day * 1.5  # slight upward trend (pollution worsening)
        baseline = max(30, baseline)
        
        # Simulated: apply reduction with response delay
        simulated = baseline
        for source, intervention_pct in interventions.items():
            if intervention_pct == 0:
                continue
            
            delay = RESPONSE_DELAY.get(source, 1)
            if day >= delay:
                # Gradual ramp-up of effect
                ramp = min(1.0, (day - delay + 1) / 3)  # Full effect after 3 days
                source_contribution = avg_mix.get(source, 0)
                impact_coeff = INTERVENTION_IMPACT.get(source, 0.3)
                reduction = baseline * (intervention_pct / 100) * source_contribution * impact_coeff * ramp
                simulated -= reduction
        
        simulated = max(20, simulated)
        
        trend.append({
            "day": day_label,
            "baseline": round(baseline, 1),
            "simulated": round(simulated, 1),
            "reduction": round(baseline - simulated, 1),
            "reduction_pct": round((baseline - simulated) / baseline * 100, 1) if baseline > 0 else 0,
        })
    
    # Compute summary metrics
    final_baseline = trend[-1]["baseline"]
    final_simulated = trend[-1]["simulated"]
    max_reduction = max(t["reduction"] for t in trend)
    avg_reduction = np.mean([t["reduction"] for t in trend])
    
    # Population impact
    pop = data_service.get_city_summary(city).get("population_thousands", 1000) * 1000
    pop_benefit = int(pop * (total_reduction_pct * 0.8))  # 80% of population benefits
    
    # Generate AI summary
    ai_summary = _generate_policy_summary(
        city, interventions, source_impact_details,
        current_aqi, final_simulated, avg_reduction,
        pop_benefit, simulation_days
    )
    
    return {
        "city": city,
        "current_aqi": round(current_aqi, 1),
        "interventions": interventions,
        "trend": trend,
        "source_impact": source_impact_details,
        "summary": {
            "final_baseline_aqi": round(final_baseline, 1),
            "final_simulated_aqi": round(final_simulated, 1),
            "total_reduction_pct": round(total_reduction_pct * 100, 1),
            "max_daily_reduction": round(max_reduction, 1),
            "avg_daily_reduction": round(avg_reduction, 1),
            "population_benefited": pop_benefit,
            "days_to_full_effect": max(RESPONSE_DELAY.get(s, 1) + 3 for s, v in interventions.items() if v > 0) if any(v > 0 for v in interventions.values()) else 0,
        },
        "ai_summary": ai_summary,
        "generated_at": datetime.now().isoformat(),
    }


def _get_city_avg_source_mix(city: str) -> Dict[str, float]:
    """Get average source mix across all zones in a city."""
    stations = data_service.get_stations_for_city(city)
    
    if not stations:
        return ZONE_SOURCE_MIX["mixed"]
    
    # Average the zone-type mixes across stations
    accumulated = {}
    count = 0
    
    for station in stations:
        zone = station.get("zone_type", "mixed")
        mix = ZONE_SOURCE_MIX.get(zone, ZONE_SOURCE_MIX["mixed"])
        for source, weight in mix.items():
            accumulated[source] = accumulated.get(source, 0) + weight
        count += 1
    
    if count > 0:
        for source in accumulated:
            accumulated[source] /= count
    
    return accumulated


def _generate_policy_summary(
    city: str, interventions: Dict, impact_details: List[Dict],
    current_aqi: float, final_aqi: float, avg_reduction: float,
    pop_benefit: int, days: int,
) -> str:
    """Generate an AI-powered policy summary."""
    active_interventions = [
        f"{int(v)}% {k.replace('_', ' ')}"
        for k, v in interventions.items() if v > 0
    ]
    
    if not active_interventions:
        return f"No interventions selected. Current AQI in {city} is {current_aqi:.0f}. Use the sliders to model policy scenarios."
    
    intervention_str = ", ".join(active_interventions[:-1])
    if len(active_interventions) > 1:
        intervention_str += f" and {active_interventions[-1]}"
    else:
        intervention_str = active_interventions[0]
    
    reduction_str = f"{avg_reduction:.0f}" if avg_reduction > 0 else "minimal"
    
    # Format population
    if pop_benefit > 1_000_000:
        pop_str = f"{pop_benefit / 1_000_000:.1f} million"
    elif pop_benefit > 1_000:
        pop_str = f"{pop_benefit / 1_000:.0f}k"
    else:
        pop_str = str(pop_benefit)
    
    summary = (
        f"Implementing <strong>{intervention_str}</strong> reduction in {city} "
        f"is projected to reduce overall AQI from <strong>{current_aqi:.0f}</strong> to "
        f"<strong>{final_aqi:.0f}</strong> over {days} days — "
        f"an average daily improvement of <strong>{reduction_str} AQI points</strong>. "
        f"Approximately <strong>{pop_str} residents</strong> would experience improved air quality. "
    )
    
    # Add top impact source
    if impact_details:
        top = max(impact_details, key=lambda x: x["aqi_reduction_pct"])
        summary += (
            f"The highest impact comes from <strong>{top['source']}</strong> reduction, "
            f"which contributes {top['aqi_reduction_pct']:.1f}% of the total AQI improvement."
        )
    
    return summary
