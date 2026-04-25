"""Birth time rectification engine.

Sweeps candidate birth times and scores each against life events
using transits, solar arc directions, secondary progressions, and profections.
"""

import time
from datetime import datetime, timedelta

from stellium import ChartBuilder, MultiChartBuilder
from stellium.engines import PlacidusHouses, WholeSignHouses
from stellium.engines.profections import ProfectionEngine
from stellium.utils.progressions import calculate_progressed_datetime, calculate_solar_arc

from app.core.logging import logger
from app.charts.rectification_schemas import (
    RectificationRequest,
    RectificationCandidate,
    RectificationResponse,
    RectificationEvent,
    MatchedEvent,
    MatchedAspect,
)

HOUSE_ENGINES = {"placidus": PlacidusHouses, "whole_sign": WholeSignHouses}

TRANSIT_ORBS = {
    "Conjunction": 3.0, "Opposition": 3.0, "Square": 2.5,
    "Trine": 2.5, "Sextile": 2.0, "Quincunx": 1.5,
}

SOLAR_ARC_ORBS = {
    "Conjunction": 1.5, "Opposition": 1.5, "Square": 1.0,
    "Trine": 1.0, "Sextile": 0.75, "Quincunx": 0.5,
}

PROGRESSION_ORBS = {
    "Conjunction": 1.0, "Opposition": 1.0, "Square": 0.75,
    "Trine": 0.75, "Sextile": 0.5, "Quincunx": 0.5,
}

SIGN_NAMES = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
]

OUTER_PLANETS = {"Saturn", "Jupiter", "Uranus", "Neptune", "Pluto"}

EVENT_WEIGHTS = {
    "career":       {"angles": ["MC", "DSC"], "houses": [10, 6, 2],   "planets": ["Saturn", "Jupiter", "Sun"]},
    "relationship": {"angles": ["DSC", "ASC"], "houses": [7, 5, 1],   "planets": ["Venus", "Mars", "Moon"]},
    "relocation":   {"angles": ["ASC", "IC"],  "houses": [4, 9, 3],   "planets": ["Mercury", "Jupiter"]},
    "health":       {"angles": ["ASC", "IC"],  "houses": [1, 6, 12],  "planets": ["Mars", "Saturn"]},
    "family":       {"angles": ["IC", "ASC"],  "houses": [4, 5, 10],  "planets": ["Moon", "Venus"]},
    "education":    {"angles": ["MC", "ASC"],  "houses": [9, 3, 10],  "planets": ["Mercury", "Jupiter"]},
    "financial":    {"angles": ["MC", "ASC"],  "houses": [2, 8, 10],  "planets": ["Venus", "Jupiter"]},
    "spiritual":    {"angles": ["ASC", "IC"],  "houses": [12, 9, 8],  "planets": ["Neptune", "Jupiter"]},
    "legal":        {"angles": ["MC", "DSC"],  "houses": [7, 9, 10],  "planets": ["Saturn", "Jupiter"]},
    "travel":       {"angles": ["ASC", "IC"],  "houses": [9, 3, 12],  "planets": ["Mercury", "Jupiter"]},
    "other":        {"angles": ["ASC", "MC"],  "houses": [1, 10, 7],  "planets": ["Sun", "Moon"]},
}

ASPECT_SCORE = {
    "Conjunction": 1.0, "Opposition": 0.9, "Square": 0.7,
    "Trine": 0.8, "Sextile": 0.5, "Quincunx": 0.4,
}


def _sign_from_lon(lon: float) -> str:
    return SIGN_NAMES[int(lon / 30) % 12]


def _is_relevant_planet(planet_name: str, event_type: str) -> bool:
    weights = EVENT_WEIGHTS.get(event_type, EVENT_WEIGHTS["other"])
    return planet_name in weights["planets"] or planet_name in OUTER_PLANETS


def _is_relevant_natal_point(point_name: str, event_type: str) -> bool:
    weights = EVENT_WEIGHTS.get(event_type, EVENT_WEIGHTS["other"])
    return point_name in weights["angles"] or point_name.startswith("House_")


def _aspect_name(degree: int) -> str:
    mapping = {0: "Conjunction", 60: "Sextile", 90: "Square", 120: "Trine", 150: "Quincunx", 180: "Opposition"}
    return mapping.get(degree, "")


def _check_aspects(
    pos1_lon: float, pos1_name: str,
    pos2_lon: float, pos2_name: str,
    orbs: dict[str, float],
) -> list[dict]:
    results = []
    diff = abs(pos1_lon - pos2_lon) % 360
    if diff > 180:
        diff = 360 - diff
    for degree, name in [(0, "Conjunction"), (60, "Sextile"), (90, "Square"), (120, "Trine"), (150, "Quincunx"), (180, "Opposition")]:
        orb = orbs.get(name, 2.0)
        if abs(diff - degree) <= orb:
            actual_orb = abs(diff - degree)
            results.append({"aspect": name, "orb": round(actual_orb, 2)})
    return results


def _score_transits(natal_chart, event_date_str: str, event_type: str) -> list[MatchedAspect]:
    try:
        transit_chart = (
            ChartBuilder.from_details(event_date_str, natal_chart.native.location_str)
            .with_house_systems(natal_chart.house_systems)
            .calculate()
        )
        mc = MultiChartBuilder.transit(natal_chart, transit_chart).calculate()
        cross = mc.get_cross_aspects()
    except Exception:
        return []

    matched = []
    weights = EVENT_WEIGHTS.get(event_type, EVENT_WEIGHTS["other"])
    for asp in cross:
        if asp.orb > TRANSIT_ORBS.get(asp.aspect_name, 3.0):
            continue
        t_name = asp.object1.name if hasattr(asp.object1, "name") else str(asp.object1)
        n_name = asp.object2.name if hasattr(asp.object2, "name") else str(asp.object2)
        is_relevant = (
            t_name in OUTER_PLANETS
            or t_name in weights["planets"]
            or n_name in weights["angles"]
            or (n_name.startswith("House_") and int(n_name.split("_")[1]) in weights["houses"])
        )
        if is_relevant:
            matched.append(MatchedAspect(
                planet=t_name, natal_point=n_name,
                aspect=asp.aspect_name, orb=round(asp.orb, 2), technique="transit",
            ))
    return matched


def _score_solar_arc(natal_chart, event_date_str: str, event_type: str) -> list[MatchedAspect]:
    try:
        birth_dt = natal_chart.native.datetime
        event_dt = datetime.fromisoformat(event_date_str.replace("Z", "+00:00"))
        age = (event_dt - birth_dt).days / 365.25
        if age < 1:
            return []
        directed = MultiChartBuilder.arc_direction(natal_chart, age=age, arc_type="solar_arc").calculate()
        cross = directed.get_cross_aspects()
    except Exception:
        return []

    matched = []
    weights = EVENT_WEIGHTS.get(event_type, EVENT_WEIGHTS["other"])
    for asp in cross:
        if asp.orb > SOLAR_ARC_ORBS.get(asp.aspect_name, 1.5):
            continue
        d_name = asp.object1.name if hasattr(asp.object1, "name") else str(asp.object1)
        n_name = asp.object2.name if hasattr(asp.object2, "name") else str(asp.object2)
        is_relevant = (
            d_name in weights["planets"]
            or n_name in weights["angles"]
            or (n_name.startswith("House_") and int(n_name.split("_")[1]) in weights["houses"])
        )
        if is_relevant:
            matched.append(MatchedAspect(
                planet=d_name, natal_point=n_name,
                aspect=asp.aspect_name, orb=round(asp.orb, 2), technique="solar_arc",
            ))
    return matched


def _score_profection(natal_chart, event_date_str: str, event_type: str) -> float:
    try:
        birth_dt = natal_chart.native.datetime
        event_dt = datetime.fromisoformat(event_date_str.replace("Z", "+00:00"))
        age = int((event_dt - birth_dt).days / 365.25)
        if age < 1:
            return 0.0
        engine = ProfectionEngine(natal_chart)
        prof = engine.annual(age)
        weights = EVENT_WEIGHTS.get(event_type, EVENT_WEIGHTS["other"])
        score = 0.0
        if prof.profected_house in weights["houses"]:
            score += 1.0
        ruler = prof.ruler.lower() if prof.ruler else ""
        if ruler in [p.lower() for p in weights["planets"]]:
            score += 0.8
        if prof.ruler_house in weights["houses"]:
            score += 0.5
        return score
    except Exception:
        return 0.0


def _score_event(natal_chart, event: RectificationEvent) -> MatchedEvent:
    transit_aspects = _score_transits(natal_chart, event.date, event.event_type)
    arc_aspects = _score_solar_arc(natal_chart, event.date, event.event_type)
    profection_score = _score_profection(natal_chart, event.date, event.event_type)

    score = 0.0
    for a in transit_aspects:
        score += ASPECT_SCORE.get(a.aspect, 0.5) * (1.0 - a.orb / TRANSIT_ORBS.get(a.aspect, 3.0)) * 0.4
    for a in arc_aspects:
        score += ASPECT_SCORE.get(a.aspect, 0.5) * (1.0 - a.orb / SOLAR_ARC_ORBS.get(a.aspect, 1.5)) * 0.35
    score += profection_score * 0.25

    all_aspects = transit_aspects + arc_aspects
    return MatchedEvent(
        event_date=event.date,
        event_type=event.event_type,
        event_description=event.description,
        score=round(score, 3),
        matched_aspects=all_aspects,
    )


def rectify(request: RectificationRequest, progress_callback=None) -> RectificationResponse:
    t0 = time.perf_counter()
    engine_cls = HOUSE_ENGINES.get(request.house_system, PlacidusHouses)

    birth_date = datetime.fromisoformat(request.birth_date.replace("Z", "+00:00"))
    base_date_str = birth_date.strftime("%Y-%m-%d")
    step = request.step_minutes

    candidates: list[RectificationCandidate] = []

    total_minutes = 24 * 60
    total_candidates = len(range(0, total_minutes, step))
    progress_interval = max(1, total_candidates // 10)

    for i, minute in enumerate(range(0, total_minutes, step)):
        h = minute // 60
        m = minute % 60
        time_str = f"{h:02d}:{m:02d}:00"
        dt_str = f"{base_date_str}T{time_str}"

        try:
            natal = (
                ChartBuilder.from_details(dt_str, request.location)
                .with_house_systems([engine_cls()])
                .with_aspects()
                .calculate()
            )
        except Exception:
            continue

        asc_lon = 0.0
        mc_lon = 0.0
        for pos in natal.positions:
            name = pos.name if hasattr(pos, "name") else str(pos)
            if name == "ASC":
                asc_lon = pos.longitude
            elif name == "MC":
                mc_lon = pos.longitude

        total = 0.0
        matched_events: list[MatchedEvent] = []
        for event in request.events:
            me = _score_event(natal, event)
            total += me.score
            matched_events.append(me)

        candidates.append(RectificationCandidate(
            birth_time=time_str[:5],
            asc_degree=round(asc_lon, 2),
            mc_degree=round(mc_lon, 2),
            asc_sign=_sign_from_lon(asc_lon),
            mc_sign=_sign_from_lon(mc_lon),
            total_score=round(total, 3),
            matched_events=matched_events,
        ))

        if progress_callback and (i + 1) % progress_interval == 0:
            progress_callback(int(((i + 1) / total_candidates) * 100))

    if progress_callback:
        progress_callback(100)

    candidates.sort(key=lambda c: c.total_score, reverse=True)
    top = candidates[:10]

    elapsed = (time.perf_counter() - t0) * 1000
    logger.info("Rectification complete", candidates=len(candidates), top_score=top[0].total_score if top else 0, ms=round(elapsed))

    return RectificationResponse(
        candidates=top,
        event_count=len(request.events),
        step_minutes=step,
        computation_time_ms=round(elapsed, 0),
    )
