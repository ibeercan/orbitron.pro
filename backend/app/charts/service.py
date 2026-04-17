import base64
import io
import os
import tempfile
from typing import Dict, Any

from stellium import ChartBuilder
from stellium.engines import PlacidusHouses

from app.core.config import logger


class ChartService:
    async def create_natal_chart(
        self,
        datetime_str: str,
        location: str,
        theme: str = "classic",
        house_system: str = "placidus",
        preset: str = "detailed",
        zodiac_palette: str = "rainbow",
    ) -> Dict[str, Any]:
        """
        Create a natal chart using Stellium.
        SVG is rendered to a temporary file, read into memory as base64,
        and the temp file is immediately deleted — nothing is persisted on disk.
        """
        logger.info(
            "Creating natal chart",
            datetime=datetime_str,
            location=location,
            theme=theme,
            house_system=house_system,
        )

        # Map house systems
        house_engine = PlacidusHouses()
        if house_system == "whole_sign":
            from stellium.engines import WholeSignHouses
            house_engine = WholeSignHouses()

        # Use a named temp file so Stellium can write to it by path,
        # then we read and delete it immediately.
        tmp = tempfile.NamedTemporaryFile(suffix=".svg", delete=False)
        tmp_path = tmp.name
        tmp.close()

        try:
            # Build and calculate chart
            chart = (
                ChartBuilder.from_details(datetime_str, location)
                .with_house_systems([house_engine])
                .calculate()
            )
            logger.info("Chart calculated", planets=len(chart.get_planets()))

            # Render SVG to temp path
            drawer = (
                chart.draw(tmp_path)
                .with_theme(theme)
                .with_zodiac_palette(zodiac_palette)
            )
            if preset == "minimal":
                drawer.preset_minimal()
            elif preset == "standard":
                drawer.preset_standard()
            else:
                drawer.preset_detailed()

            drawer.save()

            # Read SVG bytes and encode as base64
            with open(tmp_path, "rb") as f:
                svg_bytes = f.read()

            svg_b64 = base64.b64encode(svg_bytes).decode("utf-8")
            logger.info("SVG encoded to base64", size_bytes=len(svg_bytes))

            # Build AI prompt text
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
