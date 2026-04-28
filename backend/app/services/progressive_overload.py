"""
services/progressive_overload.py — Progressive overload logic

The Epley formula estimates 1 Rep Max (1RM) from any set:
    1RM = weight × (1 + reps / 30)

Example: 100kg × 5 reps → estimated 1RM = 100 × (1 + 5/30) = 116.7kg
"""


def calculate_epley_1rm(weight_kg: float, reps: int) -> float:
    """
    Epley formula: estimates 1RM from a working set.
    Returns 0 if inputs are invalid.
    """
    if weight_kg <= 0 or reps <= 0:
        return 0.0
    return weight_kg * (1 + reps / 30)


def get_recommendation(sessions: list[list[dict]]) -> dict:
    """
    Given a list of recent sessions (each session is a list of set dicts),
    returns a progression recommendation.

    Args:
        sessions: [[{"weight_kg": 100, "reps": 8, "is_warmup": False}, ...], ...]
                  Index 0 = most recent, index -1 = oldest

    Returns:
        {"recommendation": str, "suggested_weight_kg": float | None}
    """
    # Filter out warmup sets from each session
    working_sessions = [
        [s for s in session if not s.get("is_warmup", False)]
        for session in sessions
    ]
    # Remove sessions with no working sets
    working_sessions = [s for s in working_sessions if s]

    if len(working_sessions) < 2:
        return {
            "recommendation": "Log at least 2 sessions to unlock personalised recommendations.",
            "suggested_weight_kg": None,
        }

    def best_set(session: list[dict]) -> dict:
        """Returns the set with the highest estimated 1RM."""
        return max(session, key=lambda s: calculate_epley_1rm(s["weight_kg"], s["reps"]))

    last = best_set(working_sessions[0])   # Most recent session
    prev = best_set(working_sessions[1])   # Session before that

    last_e1rm = calculate_epley_1rm(last["weight_kg"], last["reps"])
    prev_e1rm = calculate_epley_1rm(prev["weight_kg"], prev["reps"])

    # Check for stall across 3 sessions
    if len(working_sessions) >= 3:
        old = best_set(working_sessions[2])
        old_e1rm = calculate_epley_1rm(old["weight_kg"], old["reps"])
        # If e1RM hasn't improved by more than 1% across 3 sessions → stall
        if last_e1rm <= old_e1rm * 1.01 and prev_e1rm <= old_e1rm * 1.01:
            deload_weight = round(last["weight_kg"] * 0.5, 1)
            return {
                "recommendation": (
                    f"Progress stalled for 3+ sessions at {last['weight_kg']}kg. "
                    f"Take a deload week at {deload_weight}kg for 3 sets of 10, then reset."
                ),
                "suggested_weight_kg": deload_weight,
            }

    # Progress made — suggest increase
    if last_e1rm > prev_e1rm * 1.02:
        suggested = round(last["weight_kg"] + 2.5, 1)
        return {
            "recommendation": (
                f"Great progress! You hit {last['weight_kg']}kg × {last['reps']} reps. "
                f"Try {suggested}kg next session."
            ),
            "suggested_weight_kg": suggested,
        }

    # Same weight — push for more reps
    return {
        "recommendation": (
            f"Stay at {last['weight_kg']}kg and aim for {last['reps'] + 1}–{last['reps'] + 2} reps. "
            f"Hit the top of your rep range before adding weight."
        ),
        "suggested_weight_kg": last["weight_kg"],
    }
