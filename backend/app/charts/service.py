import base64
import os
import re
import tempfile
from typing import Dict, Any

from stellium import ChartBuilder
from stellium.engines import PlacidusHouses, WholeSignHouses

from app.core.logging import logger


# Mapping of house system names to engine classes
HOUSE_ENGINES = {
    "placidus": PlacidusHouses,
    "whole_sign": WholeSignHouses,
}

# Supported themes with their matching zodiac palettes
THEME_PALETTE_MAP = {
    "midnight": "rainbow_midnight",
    "dark":     "rainbow_dark",
    "celestial": "rainbow_celestial",
    "neon":     "rainbow_neon",
    "sepia":    "rainbow_sepia",
    "classic":  "rainbow",
    "pastel":   "rainbow",
    "viridis":  "rainbow",
    "plasma":   "rainbow",
    "inferno":  "rainbow",
    "magma":    "rainbow",
}


def _make_svg_transparent(svg_bytes: bytes) -> bytes:
    """
    Post-process Stellium SVG to make the background transparent.

    Strategy:
    1. Find the first <rect ...> tag after the <svg ...> opening tag
    2. Replace any fill="..." or fill='...' attribute inside it with fill="none"
    3. If no fill attribute found, add fill="none" to that rect

    This removes Stellium's solid background rect so the dark card background
    shows through.
    """
    svg = svg_bytes.decode("utf-8")

    # Find position of first <rect after the <svg opening tag
    svg_open_end = svg.find(">")
    if svg_open_end == -1:
        return svg_bytes  # malformed SVG, return as-is

    first_rect_start = svg.find("<rect", svg_open_end)
    if first_rect_start == -1:
        return svg_bytes  # no rect found

    first_rect_end = svg.find(">", first_rect_start)
    if first_rect_end == -1:
        return svg_bytes  # malformed rect

    # Extract the rect tag (include the closing >)
    rect_tag = svg[first_rect_start:first_rect_end + 1]

    # Replace fill attribute in that tag
    if 'fill=' in rect_tag:
        new_rect = re.sub(r'fill=["\'][^"\']*["\']', 'fill="none"', rect_tag, count=1)
    else:
        # No fill attribute — inject one before the closing />/> 
        if rect_tag.endswith("/>"):
            new_rect = rect_tag[:-2] + ' fill="none"/>'
        else:
            new_rect = rect_tag[:-1] + ' fill="none">'

    svg = svg[:first_rect_start] + new_rect + svg[first_rect_end + 1:]
    return svg.encode("utf-8")


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

        SVG is rendered to a temp file, read into memory, background made
        transparent via post-processing, then encoded as base64 for DB storage.
        Nothing is persisted on disk.
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

        tmp = tempfile.NamedTemporaryFile(suffix=".svg", delete=False)
        tmp_path = tmp.name
        tmp.close()

        try:
            # Build and calculate chart
            chart = (
                ChartBuilder.from_details(datetime_str, location)
                .with_house_systems([house_engine])
                .with_aspects()
                .calculate()
            )
            logger.info("Chart calculated", planets=len(chart.get_planets()))

            # Draw: minimal preset = only the wheel, no text corners.
            # This avoids all English labels (chart_info, moon_phase, etc.)
            # that Stellium doesn't localise, and avoids mojibake from
            # Cyrillic location names being embedded in SVG text nodes.
            drawer = (
                chart.draw(tmp_path)
                .with_size(900)
                .with_theme(theme)
                .with_zodiac_palette(zodiac_palette)
                .preset_minimal()
            )
            drawer.save()
            logger.info("SVG rendered", path=tmp_path)

            # Read raw SVG bytes
            with open(tmp_path, "rb") as f:
                svg_bytes = f.read()

            # Post-process: make background transparent so the dark card
            # background shows through without a white/coloured rect
            svg_bytes = _make_svg_transparent(svg_bytes)
            logger.info("SVG background made transparent", size_bytes=len(svg_bytes))

            svg_b64 = base64.b64encode(svg_bytes).decode("utf-8")

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
            try:
                os.unlink(tmp_path)
            except OSError:
                pass


chart_service = ChartService()
