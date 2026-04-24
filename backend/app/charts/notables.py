"""Notable people & events — Star Twins, Historical Parallels."""

import asyncio
from pathlib import Path
from typing import Any

from stellium import (
    ChartBuilder,
    MultiChartBuilder,
    CalculatedChart,
    Notable,
    get_notable_registry,
)
import stellium
from stellium.engines import PlacidusHouses

from app.core.logging import logger

TZ_FIXES = {
    "Europe/Kiev": "Europe/Kyiv",
    "Europe/Uzhgorod": "Europe/Kyiv",
    "Europe/Zaporozhye": "Europe/Kyiv",
}

_yaml_fixed = False


def _fix_stellium_timezone_yaml() -> None:
    global _yaml_fixed
    if _yaml_fixed:
        return

    stellium_dir = Path(stellium.__file__).parent
    yaml_path = stellium_dir / "data" / "notables" / "events" / "historical.yaml"
    if not yaml_path.exists():
        logger.warning("Stellium events YAML not found", path=str(yaml_path))
        _yaml_fixed = True
        return

    content = yaml_path.read_text(encoding="utf-8")
    changed = False
    for old_tz, new_tz in TZ_FIXES.items():
        if old_tz in content:
            content = content.replace(old_tz, new_tz)
            changed = True

    if changed:
        yaml_path.write_text(content, encoding="utf-8")
        logger.info("Fixed stale timezone entries in Stellium events YAML")

    _yaml_fixed = True

ZODIAC_RU = [
    "Овен", "Телец", "Близнецы", "Рак",
    "Лев", "Дева", "Весы", "Скорпион",
    "Стрелец", "Козерог", "Водолей", "Рыбы",
]

CATEGORY_RU: dict[str, str] = {
    "architect": "Архитектор",
    "artist": "Художник",
    "astrologer": "Астролог",
    "athlete": "Спортсмен",
    "business": "Бизнес",
    "criminal": "Криминал",
    "explorer": "Исследователь",
    "leader": "Лидер",
    "media": "Медиа",
    "occultist": "Мистик",
    "philosopher": "Философ",
    "polymath": "Эрудит",
    "scientist": "Учёный",
    "writer": "Писатель",
}

_notable_charts: dict[str, tuple[Notable, CalculatedChart]] = {}
_events_data: list[Notable] = []
_charts_loaded = False
_results_cache: dict[int, dict[str, Any]] = {}
_parallels_cache: dict[int, dict[str, Any]] = {}


def _sign_from_longitude(longitude: float) -> str:
    return ZODIAC_RU[int(longitude / 30) % 12]


def _get_planet_sign(chart: CalculatedChart, planet_name: str) -> str | None:
    for p in chart.get_planets():
        if p.name == planet_name:
            return _sign_from_longitude(p.longitude)
    return None


def _build_all_notable_charts() -> None:
    global _charts_loaded
    if _charts_loaded:
        return

    _fix_stellium_timezone_yaml()
    reg = get_notable_registry()

    for n in reg.get_births():
        try:
            chart = (
                ChartBuilder.from_native(n)
                .with_house_systems([PlacidusHouses()])
                .with_aspects()
                .calculate()
            )
            _notable_charts[n.name] = (n, chart)
        except Exception as e:
            logger.warning("Failed to build notable chart", name=n.name, error=str(e))

    for n in reg.get_events():
        _events_data.append(n)

    _charts_loaded = True
    logger.info("Notable charts loaded", births=len(_notable_charts), events=len(_events_data))


async def ensure_notable_charts() -> None:
    if _charts_loaded:
        return
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _build_all_notable_charts)


def _compute_astro_twins_sync(user_chart: CalculatedChart) -> list[dict[str, Any]]:
    user_sun = _get_planet_sign(user_chart, "Sun")
    user_moon = _get_planet_sign(user_chart, "Moon")

    results: list[dict[str, Any]] = []
    for name, (notable, notable_chart) in _notable_charts.items():
        try:
            multi = (
                MultiChartBuilder.synastry(
                    user_chart, notable_chart,
                    label1="Вы", label2=notable.name,
                )
                .with_cross_aspects(pairs="all")
                .calculate()
            )
            score = multi.calculate_compatibility_score()

            notable_sun = _get_planet_sign(notable_chart, "Sun")
            notable_moon = _get_planet_sign(notable_chart, "Moon")

            shared: list[str] = []
            if user_sun and notable_sun and user_sun == notable_sun:
                shared.append(f"Солнце в {user_sun}")
            if user_moon and notable_moon and user_moon == notable_moon:
                shared.append(f"Луна в {user_moon}")

            key_aspects: list[str] = []
            for asp in multi.get_all_cross_aspects()[:5]:
                key_aspects.append(f"{asp.object1.name} {asp.aspect_name} {asp.object2.name}")

            results.append({
                "name": notable.name,
                "category": notable.category,
                "category_ru": CATEGORY_RU.get(notable.category, notable.category),
                "notable_for": notable.notable_for or "",
                "score": round(score, 1),
                "year": notable.datetime.utc_datetime.year,
                "shared_features": shared,
                "key_aspects": key_aspects[:3],
            })
        except Exception as e:
            logger.warning("Failed to compare with notable", name=name, error=str(e))

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:10]


async def compute_astro_twins(
    user_chart: CalculatedChart,
    natal_chart_id: int,
) -> dict[str, Any]:
    if natal_chart_id in _results_cache:
        return _results_cache[natal_chart_id]

    await ensure_notable_charts()

    loop = asyncio.get_event_loop()
    results = await loop.run_in_executor(None, _compute_astro_twins_sync, user_chart)

    cached: dict[str, Any] = {"status": "done", "results": results}
    _results_cache[natal_chart_id] = cached
    return cached


def _compute_historical_parallels_sync(user_chart: CalculatedChart) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []

    for event in _events_data:
        try:
            event_chart = (
                ChartBuilder.from_native(event)
                .with_house_systems([PlacidusHouses()])
                .with_aspects()
                .calculate()
            )
            multi = (
                MultiChartBuilder.synastry(
                    user_chart, event_chart,
                    label1="Вы", label2=event.name,
                )
                .with_cross_aspects(pairs="all")
                .calculate()
            )
            score = multi.calculate_compatibility_score()

            key_aspects: list[str] = []
            for asp in multi.get_all_cross_aspects()[:3]:
                key_aspects.append(f"{asp.object1.name} {asp.aspect_name} {asp.object2.name}")

            results.append({
                "name": event.name,
                "year": event.datetime.utc_datetime.year,
                "notable_for": event.notable_for or "",
                "score": round(score, 1),
                "key_aspects": key_aspects,
            })
        except Exception as e:
            logger.warning("Failed to compute historical parallel", event=event.name, error=str(e))

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:5]


async def compute_historical_parallels(
    user_chart: CalculatedChart,
    natal_chart_id: int,
) -> dict[str, Any]:
    if natal_chart_id in _parallels_cache:
        return _parallels_cache[natal_chart_id]

    await ensure_notable_charts()

    loop = asyncio.get_event_loop()
    results = await loop.run_in_executor(None, _compute_historical_parallels_sync, user_chart)

    cached: dict[str, Any] = {"status": "done", "results": results}
    _parallels_cache[natal_chart_id] = cached
    return cached


def list_notable_events() -> list[dict[str, Any]]:
    reg = get_notable_registry()
    events: list[dict[str, Any]] = []
    for e in reg.get_events():
        try:
            events.append({
                "name": e.name,
                "year": e.datetime.utc_datetime.year,
                "subcategories": e.subcategories or [],
                "notable_for": e.notable_for or "",
                "location_name": e.location.name,
            })
        except Exception:
            pass
    return events
