"""
Progressive overload recommendation engine.

This analyzes workout history and suggests progression strategies.
"""

from typing import List, Dict, Any


def get_progressive_overload_recommendation(sessions: List[List[Dict[str, Any]]]) -> Dict[str, Any]:
    """
    Analyze workout sessions and suggest progression.
    
    Args:
        sessions: List of sessions, each containing workout sets
        
    Returns:
        Dictionary with status and recommendation
    """
    if not sessions:
        return {
            "status": "no_data",
            "suggestion": "Complete your first workout",
            "message": "No workout history available"
        }
    
    # Get last 2-4 working sets (exclude warmups)
    last_sessions = sessions[:4]  # Last 4 sessions
    working_sets = []
    
    for session in last_sessions:
        for s in session:
            if not s.get("isWarmup", False):
                working_sets.append(s)
    
    if not working_sets:
        return {
            "status": "no_data",
            "suggestion": "Log working sets",
            "message": "Only warmup sets recorded"
        }
    
    # Check if hit top of rep range (e.g., 12 reps) in last 2 sessions
    last_2 = working_sets[:2]
    rep_count = sum(1 for s in last_2 if s["reps"] >= 12)
    
    if rep_count >= 1:
        # Suggest weight increase
        avg_weight = sum(s["weightKg"] for s in last_2) / len(last_2)
        new_weight = round(avg_weight + 2.5, 1)
        
        return {
            "status": "suggest_increase",
            "suggestion": f"Increase weight by 2.5kg to {new_weight}kg",
            "message": "Consistently hitting upper rep range - time to progress!"
        }
    
    # Check if weight decreased significantly
    if len(working_sets) >= 2:
        weight_trend = working_sets[0]["weightKg"] - working_sets[-1]["weightKg"]
        if weight_trend < -2.5:
            return {
                "status": "stalled",
                "suggestion": "Consider deload week or form check",
                "message": "Weight has decreased - check form and recovery"
            }
    
    return {
        "status": "on_track",
        "suggestion": None,
        "message": "Keep doing what you're doing!"
    }


def calculate_estimated_1rm(weight_kg: float, reps: int) -> float:
    """
    Estimate 1 rep max using Epley formula.
    
    Formula: 1RM = Weight × (1 + Reps/30)
    """
    if reps < 1:
        return weight_kg
    return round(weight_kg * (1 + reps / 30), 1)
