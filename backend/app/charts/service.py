"""Chart service — natal, synastry, transit, solar/lunar return, profection."""

import base64
import os
import re
import tempfile
from datetime import datetime as dt, timezone
from typing import Dict, Any

from stellium import ChartBuilder, MultiChartBuilder, ReportBuilder
from stellium.engines import PlacidusHouses, WholeSignHouses

from app.core.logging import logger

HOUSE_ENGINES = {
    "placidus": PlacidusHouses,
    "whole_sign": WholeSignHouses,
}

THEME_PALETTE_MAP = {
    "midnight": "rainbow_midnight",
    "dark": "rainbow_dark",
    "celestial": "rainbow_celestial",
    "neon": "rainbow_neon",
    "sepia": "rainbow_sepia",
    "classic": "rainbow",
    "pastel": "rainbow",
    "viridis": "rainbow",
    "plasma": "rainbow",
    "inferno": "rainbow",
    "magma": "rainbow",
}


def _resolve_palette(theme: str, zodiac_palette: str) -> str:
    if zodiac_palette != "auto" and zodiac_palette in (
        "grey", "rainbow", "elemental", "cardinality",
        "rainbow_dark", "rainbow_midnight", "rainbow_celestial",
        "rainbow_neon", "rainbow_sepia",
    ):
        return zodiac_palette
    return THEME_PALETTE_MAP.get(theme, "rainbow_midnight")


def _make_svg_transparent(svg_bytes: bytes) -> bytes:
    svg = svg_bytes.decode("utf-8")
    svg_open_end = svg.find(">")
    if svg_open_end == -1:
        return svg_bytes
    first_rect_start = svg.find("<rect", svg_open_end)
    if first_rect_start == -1:
        return svg_bytes
    first_rect_end = svg.find(">", first_rect_start)
    if first_rect_end == -1:
        return svg_bytes
    rect_tag = svg[first_rect_start:first_rect_end + 1]
    if 'fill=' in rect_tag:
        new_rect = re.sub(r'fill=["\'][^"\']*["\']', 'fill="none"', rect_tag, count=1)
    else:
        if rect_tag.endswith("/>"):
            new_rect = rect_tag[:-2] + ' fill="none"/>'
        else:
            new_rect = rect_tag[:-1] + ' fill="none">'
    svg = svg[:first_rect_start] + new_rect + svg[first_rect_end + 1:]
    return svg.encode("utf-8")


def _render_svg(chart_or_multi, theme: str = "midnight", zodiac_palette: str = "auto",
                size: int = 900, preset: str = "preset_minimal") -> bytes:
    palette = _resolve_palette(theme, zodiac_palette)
    tmp = tempfile.NamedTemporaryFile(suffix=".svg", delete=False)
    tmp_path = tmp.name
    tmp.close()
    try:
        drawer = (
            chart_or_multi.draw(tmp_path)
            .with_size(size)
            .with_theme(theme)
            .with_zodiac_palette(palette)
        )
        if preset == "preset_minimal":
            drawer = drawer.preset_minimal()
        elif preset == "preset_standard":
            drawer = drawer.preset_standard()
        else:
            drawer = drawer.preset_minimal()
        drawer.save()
        with open(tmp_path, "rb") as f:
            svg_bytes = f.read()
        svg_bytes = _make_svg_transparent(svg_bytes)
        return svg_bytes
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


def _svg_to_b64(svg_bytes: bytes) -> str:
    return base64.b64encode(svg_bytes).decode("utf-8")


def _build_natal(datetime_str: str, location: str, house_system: str = "placidus"):
    engine_cls = HOUSE_ENGINES.get(house_system, PlacidusHouses)
    return (
        ChartBuilder.from_details(datetime_str, location)
        .with_house_systems([engine_cls()])
        .with_aspects()
        .calculate()
    )


class ChartService:
    async def create_natal_chart(
        self,
        datetime_str: str,
        location: str,
        theme: str = "midnight",
        house_system: str = "placidus",
        preset: str = "detailed",
        zodiac_palette: str = "auto",
        name: str | None = None,
    ) -> Dict[str, Any]:
        logger.info("Creating natal chart", datetime=datetime_str, location=location, theme=theme)
        chart = _build_natal(datetime_str, location, house_system)
        svg_bytes = _render_svg(chart, theme, zodiac_palette)
        svg_b64 = _svg_to_b64(svg_bytes)
        return {
            "name": name,
            "chart_type": "natal",
            "native_data": {"datetime": datetime_str, "location": location},
            "result_data": chart.to_dict(),
            "svg_data": svg_b64,
            "prompt_text": chart.to_prompt_text(),
        }

    async def create_synastry_chart(
        self,
        natal_chart_data: dict,
        person2_datetime: str,
        person2_location: str,
        person2_name: str = "Partner",
        person1_name: str = "You",
        theme: str = "midnight",
        zodiac_palette: str = "auto",
        person_id: int | None = None,
        natal_chart_id: int | None = None,
        natal_chart_name: str | None = None,
    ) -> Dict[str, Any]:
        logger.info("Creating synastry chart", person2_datetime=person2_datetime)
        dt1 = natal_chart_data["datetime"]
        loc1 = natal_chart_data["location"]
        person1 = _build_natal(dt1, loc1)
        person2 = _build_natal(person2_datetime, person2_location)
        synastry = (
            MultiChartBuilder.synastry(
                person1, person2, label1=person1_name, label2=person2_name
            )
            .with_cross_aspects(pairs="all")
            .with_house_overlays()
            .calculate()
        )
        svg_bytes = _render_svg(synastry, theme, zodiac_palette)
        svg_b64 = _svg_to_b64(svg_bytes)

        cross_aspects = synastry.get_all_cross_aspects()
        house_overlays = synastry.get_all_house_overlays()

        prompt_parts = [
            f"СИНАСТРИЯ: {person1_name} и {person2_name}",
            f"\nКросс-аспекты ({len(cross_aspects)}):",
        ]
        for asp in sorted(cross_aspects, key=lambda a: a.orb):
            applying = "приближающийся" if asp.is_applying else "расходящийся"
            prompt_parts.append(
                f"  {asp.object1.name} ({asp.object1.name[:3]}) {asp.aspect_name} "
                f"{asp.object2.name} ({asp.object2.name[:3]}) орб: {asp.orb:.2f}° ({applying})"
            )
        if house_overlays:
            prompt_parts.append(f"\nДомашние оверлеи ({len(house_overlays)}):")
            for ho in house_overlays:
                prompt_parts.append(
                    f"  {ho.planet_name} ({ho.planet_owner}) в доме {ho.falls_in_house}"
                )

        try:
            score = synastry.calculate_compatibility_score()
            prompt_parts.append(f"\nСовместимость: {score:.1f}/100")
        except Exception:
            pass

        return {
            "name": f"{person1_name} и {person2_name}",
            "chart_type": "synastry",
            "parent_chart_id": natal_chart_id,
            "person_id": person_id,
            "native_data": {
                "datetime": dt1,
                "location": loc1,
                "person1": {"datetime": dt1, "location": loc1, "name": person1_name},
                "person2": {"datetime": person2_datetime, "location": person2_location, "name": person2_name},
            },
            "result_data": synastry.to_dict(),
            "svg_data": svg_b64,
            "prompt_text": "\n".join(prompt_parts),
        }

    async def create_transit_chart(
        self,
        natal_chart_data: dict,
        transit_datetime: str | None = None,
        theme: str = "midnight",
        zodiac_palette: str = "auto",
        natal_chart_id: int | None = None,
        natal_chart_name: str | None = None,
    ) -> Dict[str, Any]:
        dt_str = natal_chart_data["datetime"]
        loc = natal_chart_data["location"]
        natal = _build_natal(dt_str, loc)

        if transit_datetime is None:
            transit_datetime = dt.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")

        logger.info("Creating transit chart", transit_datetime=transit_datetime)

        transit_chart = (
            ChartBuilder.from_details(transit_datetime, loc)
            .with_aspects()
            .calculate()
        )
        transits = (
            MultiChartBuilder.transit(
                natal, (transit_datetime, loc),
                natal_label="Натальная", transit_label="Транзиты",
            )
            .with_cross_aspects()
            .calculate()
        )
        svg_bytes = _render_svg(transits, theme, zodiac_palette)
        svg_b64 = _svg_to_b64(svg_bytes)

        cross_aspects = transits.get_all_cross_aspects()
        prompt_parts = [
            f"ТРАНЗИТЫ на {transit_datetime}",
            f"Натальная карта: {dt_str}, {loc}",
            f"\nТранзитные аспекты ({len(cross_aspects)}):",
        ]
        for asp in sorted(cross_aspects, key=lambda a: a.orb):
            applying = "приближающийся" if asp.is_applying else "расходящийся"
            prompt_parts.append(
                f"  Транзит {asp.object2.name} {asp.aspect_name} натальный {asp.object1.name} "
                f"орб: {asp.orb:.2f}° ({applying})"
            )

        return {
            "name": f"Транзиты" + (f" · {natal_chart_name}" if natal_chart_name else ""),
            "chart_type": "transit",
            "parent_chart_id": natal_chart_id,
            "native_data": {
                "datetime": dt_str,
                "location": loc,
                "transit_datetime": transit_datetime,
            },
            "result_data": transits.to_dict(),
            "svg_data": svg_b64,
            "prompt_text": "\n".join(prompt_parts),
        }

    async def calculate_transit_periods(
        self,
        natal_chart_data: dict,
        start_date: str,
        end_date: str,
    ) -> list[dict]:
        from stellium.presentation.sections.transit_periods import calculate_transit_periods

        dt_str = natal_chart_data["datetime"]
        loc = natal_chart_data["location"]
        natal = _build_natal(dt_str, loc)

        start = dt.fromisoformat(start_date.replace("Z", "+00:00"))
        end = dt.fromisoformat(end_date.replace("Z", "+00:00"))
        periods = calculate_transit_periods(natal, start, end)

        entries = []
        for p in periods:
            entries.append({
                "transit_planet": p.transit_planet,
                "natal_planet": p.natal_planet,
                "aspect_name": p.aspect_name,
                "exact_dates": [d.strftime("%Y-%m-%d") for d in p.exact_dates] if p.exact_dates else [],
                "is_multi_pass": p.is_multi_pass,
                "duration_days": p.duration_days,
            })
        return entries

    async def create_solar_return(
        self,
        natal_chart_data: dict,
        year: int | None = None,
        location_override: tuple | None = None,
        theme: str = "midnight",
        zodiac_palette: str = "auto",
        natal_chart_id: int | None = None,
        natal_chart_name: str | None = None,
    ) -> Dict[str, Any]:
        from stellium import ReturnBuilder

        dt_str = natal_chart_data["datetime"]
        loc = natal_chart_data["location"]
        natal = _build_natal(dt_str, loc)

        if year is None:
            year = dt.now(timezone.utc).year

        logger.info("Creating solar return", year=year)
        kwargs = {"natal": natal, "year": year}
        if location_override:
            kwargs["location"] = location_override
        sr = ReturnBuilder.solar(**kwargs).calculate()

        svg_bytes = _render_svg(sr, theme, zodiac_palette)
        svg_b64 = _svg_to_b64(svg_bytes)

        return {
            "name": f"Соляр {year}" + (f" · {natal_chart_name}" if natal_chart_name else ""),
            "chart_type": "solar_return",
            "parent_chart_id": natal_chart_id,
            "native_data": {
                "datetime": dt_str,
                "location": loc,
                "year": year,
                "location_override": location_override,
            },
            "result_data": sr.to_dict(),
            "svg_data": svg_b64,
            "prompt_text": sr.to_prompt_text(),
        }

    async def create_lunar_return(
        self,
        natal_chart_data: dict,
        near_date: str | None = None,
        theme: str = "midnight",
        zodiac_palette: str = "auto",
        natal_chart_id: int | None = None,
        natal_chart_name: str | None = None,
    ) -> Dict[str, Any]:
        from stellium import ReturnBuilder

        dt_str = natal_chart_data["datetime"]
        loc = natal_chart_data["location"]
        natal = _build_natal(dt_str, loc)

        logger.info("Creating lunar return", near_date=near_date)
        kwargs = {"natal": natal}
        if near_date:
            kwargs["near_date"] = near_date
        lr = ReturnBuilder.lunar(**kwargs).calculate()

        svg_bytes = _render_svg(lr, theme, zodiac_palette)
        svg_b64 = _svg_to_b64(svg_bytes)

        return {
            "name": f"Лунар" + (f" · {natal_chart_name}" if natal_chart_name else ""),
            "chart_type": "lunar_return",
            "parent_chart_id": natal_chart_id,
            "native_data": {
                "datetime": dt_str,
                "location": loc,
                "near_date": near_date,
            },
            "result_data": lr.to_dict(),
            "svg_data": svg_b64,
            "prompt_text": lr.to_prompt_text(),
        }

    async def create_profection(
        self,
        natal_chart_data: dict,
        target_date: str | None = None,
        age: int | None = None,
        rulership: str = "traditional",
        natal_chart_id: int | None = None,
        natal_chart_name: str | None = None,
    ) -> Dict[str, Any]:
        from stellium import ProfectionEngine

        dt_str = natal_chart_data["datetime"]
        loc = natal_chart_data["location"]
        natal = _build_natal(dt_str, loc)

        engine = ProfectionEngine(natal, rulership=rulership)

        if target_date:
            annual, monthly = engine.for_date(target_date)
        elif age is not None:
            annual = engine.annual(age)
            monthly = None
        else:
            target_date = dt.now(timezone.utc).strftime("%Y-%m-%d")
            annual, monthly = engine.for_date(target_date)

        prompt_parts = [
            f"ПРОФЕКЦИЯ",
            f"Натальная карта: {dt_str}, {loc}",
            f"Годовая профекция: дом {annual.profected_house} ({annual.profected_sign})",
            f"Управитель года: {annual.ruler}",
        ]
        if annual.ruler_house is not None:
            prompt_parts.append(f"Управитель в доме: {annual.ruler_house}")
        if annual.ruler_position:
            prompt_parts.append(
                f"Позиция управителя: {annual.ruler_position.sign} "
                f"{annual.ruler_position.sign_degree:.1f}°"
            )
        if annual.planets_in_house:
            names = [p.name for p in annual.planets_in_house]
            prompt_parts.append(f"Планеты в профекционном доме: {', '.join(names)}")
        if monthly:
            prompt_parts.extend([
                f"\nМесячная профекция: дом {monthly.profected_house} ({monthly.profected_sign})",
                f"Управитель месяца: {monthly.ruler}",
            ])

        profection_data = {
            "profected_house": annual.profected_house,
            "profected_sign": annual.profected_sign,
            "ruler": annual.ruler,
            "ruler_house": annual.ruler_house,
            "planets_in_house": [p.name for p in annual.planets_in_house] if annual.planets_in_house else [],
        }
        if annual.ruler_position:
            profection_data["ruler_position"] = {
                "sign": annual.ruler_position.sign,
                "sign_degree": annual.ruler_position.sign_degree,
                "is_retrograde": annual.ruler_position.is_retrograde,
            }
        if monthly:
            profection_data["monthly"] = {
                "profected_house": monthly.profected_house,
                "profected_sign": monthly.profected_sign,
                "ruler": monthly.ruler,
            }

        return {
            "name": f"Профекция" + (f" · {natal_chart_name}" if natal_chart_name else ""),
            "chart_type": "profection",
            "parent_chart_id": natal_chart_id,
            "native_data": {
                "datetime": dt_str,
                "location": loc,
                "target_date": target_date,
                "age": age,
                "rulership": rulership,
            },
            "result_data": profection_data,
            "svg_data": None,
            "prompt_text": "\n".join(prompt_parts),
        }

    async def create_solar_arc(
        self,
        natal_chart_data: dict,
        target_date: str | None = None,
        age: int | None = None,
        theme: str = "midnight",
        zodiac_palette: str = "auto",
        natal_chart_id: int | None = None,
        natal_chart_name: str | None = None,
    ) -> Dict[str, Any]:
        dt_str = natal_chart_data["datetime"]
        loc = natal_chart_data["location"]
        natal = _build_natal(dt_str, loc)

        if target_date is None and age is None:
            target_date = dt.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")

        kwargs: dict = {"arc_type": "solar_arc"}
        if target_date:
            kwargs["target_date"] = target_date
        elif age is not None:
            kwargs["age"] = float(age)

        logger.info("Creating solar arc directions", target_date=target_date, age=age)
        directed = (
            MultiChartBuilder.arc_direction(
                natal, natal_label="Натальная", directed_label="Дирекции",
                **kwargs,
            )
            .with_cross_aspects()
            .calculate()
        )

        svg_bytes = _render_svg(directed, theme, zodiac_palette)
        svg_b64 = _svg_to_b64(svg_bytes)

        cross_aspects = directed.get_all_cross_aspects()
        prompt_parts = [
            f"СОЛЯРНЫЕ ДУГИ",
            f"Натальная карта: {dt_str}, {loc}",
        ]
        if target_date:
            prompt_parts.append(f"Целевая дата: {target_date}")
        elif age is not None:
            prompt_parts.append(f"Возраст: {age}")
        prompt_parts.append(f"\nДирекционные аспекты ({len(cross_aspects)}):")
        for asp in sorted(cross_aspects, key=lambda a: a.orb):
            applying = "приближающийся" if asp.is_applying else "расходящийся"
            prompt_parts.append(
                f"  Дирекц. {asp.object2.name} {asp.aspect_name} натальный {asp.object1.name} "
                f"орб: {asp.orb:.2f}° ({applying})"
            )

        label = ""
        if target_date:
            try:
                label = dt.fromisoformat(target_date.replace("Z", "+00:00")).strftime("%Y")
            except Exception:
                label = target_date[:4]
        elif age is not None:
            try:
                birth = dt.fromisoformat(dt_str.replace("Z", "+00:00"))
                label = str(birth.year + age)
            except Exception:
                label = str(age)
        name_suffix = f" · {natal_chart_name}" if natal_chart_name else ""

        return {
            "name": f"Дирекции {label}{name_suffix}",
            "chart_type": "solar_arc",
            "parent_chart_id": natal_chart_id,
            "native_data": {
                "datetime": dt_str,
                "location": loc,
                "target_date": target_date,
                "age": age,
            },
            "result_data": directed.to_dict(),
            "svg_data": svg_b64,
            "prompt_text": "\n".join(prompt_parts),
        }

    async def create_progression(
        self,
        natal_chart_data: dict,
        target_date: str | None = None,
        age: int | None = None,
        theme: str = "midnight",
        zodiac_palette: str = "auto",
        natal_chart_id: int | None = None,
        natal_chart_name: str | None = None,
    ) -> Dict[str, Any]:
        dt_str = natal_chart_data["datetime"]
        loc = natal_chart_data["location"]
        natal = _build_natal(dt_str, loc)

        if target_date is None and age is None:
            target_date = dt.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")

        kwargs: dict = {"angle_method": "quotidian"}
        if target_date:
            kwargs["target_date"] = target_date
        elif age is not None:
            kwargs["age"] = float(age)

        logger.info("Creating secondary progression", target_date=target_date, age=age)
        progressed = (
            MultiChartBuilder.progression(
                natal, natal_label="Натальная", progressed_label="Прогрессия",
                **kwargs,
            )
            .with_cross_aspects()
            .calculate()
        )

        svg_bytes = _render_svg(progressed, theme, zodiac_palette)
        svg_b64 = _svg_to_b64(svg_bytes)

        cross_aspects = progressed.get_all_cross_aspects()
        prompt_parts = [
            f"ВТОРИЧНЫЕ ПРОГРЕССИИ",
            f"Натальная карта: {dt_str}, {loc}",
        ]
        if target_date:
            prompt_parts.append(f"Целевая дата: {target_date}")
        elif age is not None:
            prompt_parts.append(f"Возраст: {age}")
        prompt_parts.append(f"\nПрогрессные аспекты ({len(cross_aspects)}):")
        for asp in sorted(cross_aspects, key=lambda a: a.orb):
            applying = "приближающийся" if asp.is_applying else "расходящийся"
            prompt_parts.append(
                f"  Прогр. {asp.object2.name} {asp.aspect_name} натальный {asp.object1.name} "
                f"орб: {asp.orb:.2f}° ({applying})"
            )

        label = ""
        if target_date:
            try:
                label = dt.fromisoformat(target_date.replace("Z", "+00:00")).strftime("%Y")
            except Exception:
                label = target_date[:4]
        elif age is not None:
            try:
                birth = dt.fromisoformat(dt_str.replace("Z", "+00:00"))
                label = str(birth.year + age)
            except Exception:
                label = str(age)
        name_suffix = f" · {natal_chart_name}" if natal_chart_name else ""

        return {
            "name": f"Прогрессии {label}{name_suffix}",
            "chart_type": "progression",
            "parent_chart_id": natal_chart_id,
            "native_data": {
                "datetime": dt_str,
                "location": loc,
                "target_date": target_date,
                "age": age,
            },
            "result_data": progressed.to_dict(),
            "svg_data": svg_b64,
            "prompt_text": "\n".join(prompt_parts),
        }

    async def generate_pdf_report(
        self,
        natal_chart_data: dict,
        chart_type: str = "natal",
        preset: str = "standard",
        title: str | None = None,
    ) -> bytes:
        dt_str = natal_chart_data["datetime"]
        loc = natal_chart_data["location"]
        chart = _build_natal(dt_str, loc)

        builder = ReportBuilder().from_chart(chart)
        if preset == "minimal":
            builder = builder.preset_minimal()
        elif preset == "detailed":
            builder = builder.preset_detailed()
        elif preset == "full":
            builder = builder.preset_full()
        else:
            builder = builder.preset_standard()

        builder = builder.with_chart_image()
        if title:
            builder = builder.with_title(title)

        tmp = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
        tmp_path = tmp.name
        tmp.close()
        try:
            builder.render(format="pdf", file=tmp_path, show=False)
            with open(tmp_path, "rb") as f:
                return f.read()
        finally:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass


chart_service = ChartService()
