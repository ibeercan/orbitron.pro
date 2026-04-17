import base64
import os
import tempfile
from typing import Dict, Any

from stellium import ChartBuilder
from stellium.engines import PlacidusHouses, WholeSignHouses

from app.core.config import logger


# Mapping of house system names to engine classes
HOUSE_ENGINES = {
    "placidus": PlacidusHouses,
    "whole_sign": WholeSignHouses,
}

# Supported themes with their matching zodiac palettes
# We default to "midnight" — deep dark bg that perfectly matches our Gold/Purple UI
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


class ChartService:
    async def create_natal_chart(
        self,
        datetime_str: str,
        location: str,
        theme: str = "midnight",
        house_system: str = "placidus",
        preset: str = "detailed",
        zodiac_palette: str = "auto",
    ) -> Dict[str, Any]:
        """
        Create a natal chart using Stellium.

        SVG is rendered to a temporary file, read into memory as base64,
        and the temp file is immediately deleted — nothing is persisted on disk.

        Default theme is "midnight" — a deep dark theme matching the Orbitron
        Gold/Purple luxury design system perfectly.
        """
        logger.info(
            "Creating natal chart",
            datetime=datetime_str,
            location=location,
            theme=theme,
            house_system=house_system,
            preset=preset,
        )

        # Resolve house engine
        engine_cls = HOUSE_ENGINES.get(house_system, PlacidusHouses)
        house_engine = engine_cls()

        # Auto-select matching zodiac palette for the chosen theme
        if zodiac_palette == "auto" or zodiac_palette not in (
            "grey", "rainbow", "elemental", "cardinality",
            "rainbow_dark", "rainbow_midnight", "rainbow_celestial",
            "rainbow_neon", "rainbow_sepia",
        ):
            zodiac_palette = THEME_PALETTE_MAP.get(theme, "rainbow_midnight")

        logger.info("Using palette", zodiac_palette=zodiac_palette)

        # Use a named temp file so Stellium can write to it by path,
        # then we read and delete it immediately.
        tmp = tempfile.NamedTemporaryFile(suffix=".svg", delete=False)
        tmp_path = tmp.name
        tmp.close()

        try:
            # Build and calculate chart (with_aspects needed for aspect lines)
            chart = (
                ChartBuilder.from_details(datetime_str, location)
                .with_house_systems([house_engine])
                .with_aspects()
                .calculate()
            )
            logger.info("Chart calculated", planets=len(chart.get_planets()))

            # Compose the drawer with Orbitron luxury style:
            # - Use minimal preset for transparent background (no white corners)
            # - Theme with matching zodiac palette
            drawer = (
                chart.draw(tmp_path)
                .with_size(900)
                .with_theme(theme)
                .with_zodiac_palette(zodiac_palette)
            )

            # Minimal preset = just the wheel, no text info corners
            # This gives us transparent background and no English text
            if preset == "minimal":
                drawer.preset_minimal()
            elif preset == "standard":
                drawer.preset_standard()
            else:
                # detailed preset includes tables, but we use minimal for now
                # to avoid English text in corners and have transparent background
                drawer.preset_detailed()

            drawer.save()
            logger.info("SVG rendered to temp file", path=tmp_path)

            # Read SVG bytes and encode as base64
            with open(tmp_path, "rb") as f:
                svg_bytes = f.read()

            svg_b64 = base64.b64encode(svg_bytes).decode("utf-8")
            logger.info("SVG encoded to base64", size_bytes=len(svg_bytes))

            # Build AI prompt text and chart dict
            prompt_text = chart.to_prompt_text()
            chart_data = chart.to_dict()

            return {
                "native_data": {"datetime": datetime_str, "location": location},
                "result_data": chart_data,
                "svg_data": svg_b64,
                "prompt_text": prompt_text,
            }

        except Exception as e:
            logger.error(
                "Failed to create natal chart",
                error=str(e),
                datetime=datetime_str,
                location=location,
            )
            raise
        finally:
            # Always clean up the temp file
            try:
                os.unlink(tmp_path)
            except OSError:
                pass


chart_service = ChartService()
