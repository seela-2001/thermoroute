from ai.services import RiskCalculator
from .heat_data_services import HeatDataService


class HeatAnalysisService:
    """
    Orchestrates heat data retrieval and risk analysis.
    """

    def __init__(self):
        self.heat_data_service = HeatDataService()
        self.risk_calculator = RiskCalculator()

    def analyze(self, points):
        heat_data = self.heat_data_service.get_route_heat(points)

        # Check for FortyGuard errors
        errors = [
            point for point in heat_data
            if point.get("error")
        ]

        if errors:
            return {
                "success": False,
                "errors": errors,
            }

        segments = []

        for index, point in enumerate(heat_data, start=1):
            segments.append({
                "id": index,
                "temperature": point["temperature"],
                "humidity": point["humidity"],
                "heat_index": point["heat_index"],
                "aqi": point["aqi"],
            })

        analysis = self.risk_calculator.analyze_route(
            route_id="heat-analysis",
            segments=segments,
        )

        return {
            "success": True,
            "heat_data": heat_data,
            "analysis": analysis,
        }
