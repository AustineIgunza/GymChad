"""routers/tools.py — Fitness calculators (no auth required)"""

from fastapi import APIRouter
from pydantic import BaseModel
from app.services.warmup_calculator import calculate_warmup
from app.services.plate_calculator import calculate_plates
from app.services.one_rm import calculate_one_rm

router = APIRouter()


class WarmupRequest(BaseModel):
    working_weight: float
    unit: str = "kg"
    round_to: float = 2.5


class PlateRequest(BaseModel):
    target_weight: float
    bar_weight: float = 20.0
    unit: str = "kg"


class OneRmRequest(BaseModel):
    weight: float
    reps: int


@router.post("/warmup-calculator")
async def warmup_calculator(req: WarmupRequest):
    """Calculate warmup sets for a given working weight."""
    if req.unit == "lb":
        working_kg = req.working_weight / 2.20462
        round_to = req.round_to / 2.20462
    else:
        working_kg = req.working_weight
        round_to = req.round_to

    sets = calculate_warmup(working_kg, round_to=round_to)
    return {
        "working_weight": req.working_weight,
        "unit": req.unit,
        "warmup_sets": [
            {
                "set_number": s.set_number,
                "pct": s.pct,
                "weight": s.weight_lb if req.unit == "lb" else s.weight_kg,
                "reps": s.reps,
                "unit": req.unit,
            }
            for s in sets
        ],
    }


@router.post("/plate-calculator")
async def plate_calculator(req: PlateRequest):
    """Calculate plates to load for a target weight."""
    return calculate_plates(req.target_weight, req.bar_weight, req.unit)


@router.post("/1rm-calculator")
async def one_rm_calculator(req: OneRmRequest):
    """Estimate 1RM using Epley, Brzycki, and Lombardi formulas."""
    if req.reps < 1 or req.weight <= 0:
        return {"error": "Weight must be > 0 and reps >= 1"}
    return calculate_one_rm(req.weight, req.reps)
