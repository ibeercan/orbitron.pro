import os
import uuid
from pathlib import Path
from typing import Dict, Any

from stellium import ChartBuilder
from stellium.engines import PlacidusHouses

from app.core.config import settings, logger


class ChartService:
    def __init__(self):
        self.output_dir = Path("charts")
        self.output_dir.mkdir(exist_ok=True)

    async def create_natal_chart(
        self,
        datetime_str: str,
        location: str,
        theme: str = "classic",
        house_system: str = "placidus",
        preset: str = "detailed",
        zodiac_palette: str = "rainbow"
    ) -> Dict[str, Any]:
        """
        Create a natal chart using Stellium.
        """
        logger.info("Creating natal chart", datetime=datetime_str, location=location, theme=theme, house_system=house_system)

        # Map house systems
        house_engine = PlacidusHouses()  # Default
        if house_system == "whole_sign":
            from stellium.engines import WholeSignHouses
            house_engine = WholeSignHouses()

        try:
            # Build chart
            chart = (
                ChartBuilder.from_details(datetime_str, location)
                .with_house_systems([house_engine])
                .calculate()
            )
            logger.info("Chart calculated successfully", chart_objects=len(chart.get_planets()))

            # Generate SVG
            chart_id = str(uuid.uuid4())
            svg_path = self.output_dir / f"{chart_id}.svg"

            # Apply preset and palette from cookbook
            drawer = chart.draw(str(svg_path)).with_theme(theme).with_zodiac_palette(zodiac_palette)

            if preset == "minimal":
                drawer.preset_minimal()
            elif preset == "standard":
                drawer.preset_standard()
            elif preset == "detailed":
                drawer.preset_detailed()

            drawer.save()
            logger.info("SVG generated", svg_path=str(svg_path), preset=preset, palette=zodiac_palette)

            # Get prompt text
            prompt_text = chart.to_prompt_text()
            logger.info("Prompt text extracted", prompt_length=len(prompt_text))

            # Convert to dict for storage
            chart_data = chart.to_dict()

            return {
                "id": chart_id,
                "native_data": {"datetime": datetime_str, "location": location},
                "result_data": chart_data,
                "svg_path": str(svg_path),
                "prompt_text": prompt_text,
            }

        except Exception as e:
            logger.error("Failed to create natal chart", error=str(e), datetime=datetime_str, location=location)
            raise


chart_service = ChartService()