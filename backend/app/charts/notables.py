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

PLANET_RU: dict[str, str] = {
    "Sun": "Солнце", "Moon": "Луна", "Mercury": "Меркурий",
    "Venus": "Венера", "Mars": "Марс", "Jupiter": "Юпитер",
    "Saturn": "Сатурн", "Uranus": "Уран", "Neptune": "Нептун",
    "Pluto": "Плутон", "True Node": "Восходящий узел",
    "Mean Node": "Восходящий узел", "North Node": "Восходящий узел",
    "South Node": "Нисходящий узел", "Mean Apogee": "Чёрная Луна",
    "Chiron": "Хирон", "Ascendant": "Асцендент", "Midheaven": "МС",
    "Vertex": "Вертекс", "Part of Fortune": "Колесо Фортуны",
    "East Point": "Точка Востока", "South Point": "Южная точка",
    "Descendant": "Десцендент", "Imum Coeli": "IC",
    "ASC": "Асцендент", "DSC": "Десцендент", "MC": "МС", "IC": "IC",
}

_ASPECT_RU_CI: dict[str, str] = {
    k.lower(): v for k, v in {
        "conjunction": "Соединение", "square": "Квадратура",
        "opposition": "Оппозиция", "trine": "Трин", "sextile": "Секстиль",
        "quincunx": "Квинконс", "semisextile": "Полусекстиль",
        "semisquare": "Полуквадрат", "sesquiquadrate": "Сесквиквадрат",
        "parallel": "Параллель", "contraparallel": "Контрапараллель",
    }.items()
}

ASPECT_RU = _ASPECT_RU_CI

def _format_aspect(asp) -> str:
    p1 = PLANET_RU.get(asp.object1.name, asp.object1.name)
    p2 = PLANET_RU.get(asp.object2.name, asp.object2.name)
    asp_name = _ASPECT_RU_CI.get(asp.aspect_name.lower(), asp.aspect_name)
    return f"{p1} {asp_name} {p2}"


_notable_charts: dict[str, tuple[Notable, CalculatedChart]] = {}
_event_charts: dict[str, CalculatedChart] = {}
_events_data: list[Notable] = []
_charts_loaded = False


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
        try:
            chart = (
                ChartBuilder.from_native(n)
                .with_house_systems([PlacidusHouses()])
                .with_aspects()
                .calculate()
            )
            _event_charts[n.name] = chart
        except Exception as e:
            logger.warning("Failed to build event chart", name=n.name, error=str(e))

    _charts_loaded = True
    logger.info("Notable charts loaded", births=len(_notable_charts), events=len(_events_data), event_charts=len(_event_charts))


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
            sorted_aspects = sorted(multi.get_all_cross_aspects(), key=lambda a: a.orb)
            for asp in sorted_aspects[:5]:
                key_aspects.append(_format_aspect(asp))

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
    await ensure_notable_charts()
    loop = asyncio.get_event_loop()
    results = await loop.run_in_executor(None, _compute_astro_twins_sync, user_chart)
    return {"status": "done", "results": results}


def _compute_historical_parallels_sync(user_chart: CalculatedChart) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []

    for event in _events_data:
        try:
            event_chart = _event_charts.get(event.name)
            if event_chart is None:
                event_chart = (
                    ChartBuilder.from_native(event)
                    .with_house_systems([PlacidusHouses()])
                    .with_aspects()
                    .calculate()
                )
                _event_charts[event.name] = event_chart
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
            sorted_aspects = sorted(multi.get_all_cross_aspects(), key=lambda a: a.orb)
            for asp in sorted_aspects[:3]:
                key_aspects.append(_format_aspect(asp))

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
    await ensure_notable_charts()
    loop = asyncio.get_event_loop()
    results = await loop.run_in_executor(None, _compute_historical_parallels_sync, user_chart)
    return {"status": "done", "results": results}


def list_notable_events() -> list[dict[str, Any]]:
    if _charts_loaded and _events_data:
        events: list[dict[str, Any]] = []
        for e in _events_data:
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


async def bg_compute_and_persist(
    insight_id: int,
    insight_type: str,
    user_chart: CalculatedChart,
) -> None:
    from app.db.session import AsyncSessionLocal
    from app.insights.crud import insight_crud

    async with AsyncSessionLocal() as db:
        try:
            await ensure_notable_charts()
            loop = asyncio.get_event_loop()

            if insight_type == "astro_twins":
                results = await loop.run_in_executor(None, _compute_astro_twins_sync, user_chart)
            else:
                results = await loop.run_in_executor(None, _compute_historical_parallels_sync, user_chart)

            await insight_crud.mark_done(db, id=insight_id, result_data={"results": results})
            await db.commit()
            logger.info("Insight computation done", insight_id=insight_id, insight_type=insight_type)
        except Exception as e:
            try:
                await insight_crud.mark_error(db, id=insight_id, error_message=str(e))
                await db.commit()
            except Exception:
                await db.rollback()
            logger.error("Insight computation failed", insight_id=insight_id, insight_type=insight_type, error=str(e))
