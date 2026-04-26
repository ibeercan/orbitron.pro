"""Planner PDF generation — wraps Stellium PlannerBuilder."""

import time
from datetime import date as date_type
from typing import Callable

from stellium import PlannerBuilder, Native

from app.core.logging import logger


OUTER_PLANETS = ["Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"]
ALL_PLANETS = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"]


def run_planner_generation(request_data: dict, progress_callback: Callable[[int], None] | None = None) -> bytes:
    dt_str = request_data["datetime"]
    loc_str = request_data["location"]
    year = request_data["year"]
    page_size = request_data.get("page_size", "a4")
    week_starts_on = request_data.get("week_starts_on", "monday")
    timezone_str = request_data.get("timezone", "UTC")

    date_range_start = request_data.get("date_range_start")
    date_range_end = request_data.get("date_range_end")
    binding_margin = request_data.get("binding_margin")

    front_natal = request_data.get("front_natal", True)
    front_progressed = request_data.get("front_progressed", False)
    front_solar_return = request_data.get("front_solar_return", False)
    front_profections = request_data.get("front_profections", False)
    front_zr_timeline = request_data.get("front_zr_timeline", False)
    front_zr_lot = request_data.get("front_zr_lot", "Part of Fortune")
    front_ephemeris = request_data.get("front_ephemeris", False)
    front_ephemeris_harmonic = request_data.get("front_ephemeris_harmonic", 360)

    include_natal_transits = request_data.get("include_natal_transits", True)
    include_natal_transits_outer_only = request_data.get("include_natal_transits_outer_only", True)
    include_mundane_transits = request_data.get("include_mundane_transits", False)
    include_moon_phases = request_data.get("include_moon_phases", True)
    include_voc = request_data.get("include_voc", True)
    include_voc_mode = request_data.get("include_voc_mode", "traditional")
    include_ingresses = request_data.get("include_ingresses", False)
    include_stations = request_data.get("include_stations", True)

    native = Native(datetime_input=dt_str, location_input=loc_str)
    builder = (
        PlannerBuilder.for_native(native)
        .year(year)
        .timezone(timezone_str)
        .week_starts_on(week_starts_on)
        .page_size(page_size)
    )

    if date_range_start and date_range_end:
        start_date = date_type.fromisoformat(date_range_start)
        end_date = date_type.fromisoformat(date_range_end)
        builder = builder.date_range(start_date, end_date)

    if binding_margin is not None:
        builder = builder.binding_margin(binding_margin)

    if front_natal:
        builder = builder.with_natal_chart()
    if front_progressed:
        builder = builder.with_progressed_chart()
    if front_solar_return:
        builder = builder.with_solar_return()
    if front_profections:
        builder = builder.with_profections()
    if front_zr_timeline:
        builder = builder.with_zr_timeline(lot=front_zr_lot)
    if front_ephemeris:
        builder = builder.with_graphic_ephemeris(harmonic=front_ephemeris_harmonic)

    if include_natal_transits:
        if include_natal_transits_outer_only:
            builder = builder.include_natal_transits(planets=OUTER_PLANETS)
        else:
            builder = builder.include_natal_transits()
    if include_mundane_transits:
        builder = builder.include_mundane_transits()
    if include_moon_phases:
        builder = builder.include_moon_phases()
    if include_voc:
        builder = builder.include_voc(mode=include_voc_mode)
    if include_ingresses:
        builder = builder.include_ingresses()
    if include_stations:
        builder = builder.include_stations()

    if progress_callback:
        progress_callback(10)

    t0 = time.time()
    pdf_bytes = builder.generate()
    elapsed = time.time() - t0

    if progress_callback:
        progress_callback(90)

    logger.info(
        "Planner PDF generated",
        year=year,
        page_size=page_size,
        elapsed_ms=round(elapsed * 1000),
        size_bytes=len(pdf_bytes),
    )

    return pdf_bytes