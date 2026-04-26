"""Electional search engine — runs Stellium electional search with conditions."""

import time
from datetime import datetime as dt

from stellium.core.models import ChartLocation
from stellium.electional import ElectionalSearch, all_of

from app.core.logging import logger
from app.electional.presets import build_conditions, evaluate_conditions, generate_description


def run_electional_search(request_data: dict, progress_callback=None) -> dict:
    start_str = request_data["start_date"]
    end_str = request_data["end_date"]
    location_str = request_data["location"]
    step = request_data.get("step", "4hour")
    condition_keys = request_data.get("conditions", [])

    conditions = build_conditions(condition_keys)
    if not conditions:
        conditions = [lambda c: True]

    if len(conditions) == 1:
        combined = conditions[0]
    else:
        combined = all_of(*conditions)

    search = ElectionalSearch(start_str, end_str, location_str)
    search = search.where(combined)

    if progress_callback:

        def _progress_adapter(current: int, total: int):
            pct = int(current / max(total, 1) * 100)
            progress_callback(pct)

        search = search.with_progress(_progress_adapter)

    t0 = time.time()
    moments = search.find_moments(max_results=20, step=step)
    elapsed_ms = (time.time() - t0) * 1000

    results = []
    for moment in moments:
        chart = moment.chart
        moon = chart.get_object("Moon")
        cond_result = evaluate_conditions(chart, condition_keys)
        moon_sign = str(moon.sign) if moon and hasattr(moon, "sign") and moon.sign else None
        moon_phase = str(moon.phase.phase_name) if moon and hasattr(moon, "phase") and moon.phase else None
        score = int(len(cond_result["met"]) / max(len(condition_keys), 1) * 100)

        results.append({
            "datetime": moment.datetime.isoformat(),
            "moon_sign": moon_sign,
            "moon_phase": moon_phase,
            "conditions_met": cond_result["met"],
            "conditions_missed": cond_result["missed"],
            "score": score,
            "description": generate_description(cond_result["met"], cond_result["missed"]),
        })

    return {
        "moments": results,
        "total_matches": len(moments),
        "computation_time_ms": round(elapsed_ms, 1),
    }