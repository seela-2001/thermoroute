from ai.services import RiskCalculator
from .heat_data_services import HeatDataService


class HeatAnalysisService:
    def __init__(self):
        self.heat_data_service = HeatDataService()
        self.risk_calculator = RiskCalculator()

    def analyze(
        self,
        points,
        start_date=None,
        start_time=None,
    ):
        heat_data = self.heat_data_service.get_route_heat(
            points,
            start_date=start_date,
            start_time=start_time,
            use_cache=False,
        )

        errors = [point for point in heat_data if point.get("error")]

        if errors:
            return {
                "success": False,
                "errors": errors,
                "heat_data": heat_data,
            }

        segments = [
            {
                "id": index,
                "temperature": point["temperature"],
                "humidity": point["humidity"],
                "heat_index": point["heat_index"],
                "aqi": point.get("aqi", 0.0),
                "uv": point.get("uv_index", 0.0),
            }
            for index, point in enumerate(heat_data, start=1)
        ]

        analysis = self.risk_calculator.analyze_route(
            route_id="heat-analysis",
            segments=segments,
        )

        return {
            "success": True,
            "heat_data": heat_data,
            "analysis": analysis,
        }

    def analyze_at_etas(self, temporal_points, heat_cache=None):
        heat_data = self.heat_data_service.get_route_heat_at_etas(
            temporal_points,
            heat_cache=heat_cache,
        )

        successful = [point for point in heat_data if not point.get("error")]
        errors = [point for point in heat_data if point.get("error")]

        if not successful:
            return {
                "success": False,
                "errors": errors or ["No temporal heat data available"],
                "heat_data": heat_data,
            }

        segments = [
            {
                "id": index,
                "temperature": point["temperature"],
                "humidity": point["humidity"],
                "heat_index": point["heat_index"],
                "aqi": point.get("aqi", 0.0),
                "uv": point.get("uv_index", 0.0),
            }
            for index, point in enumerate(successful, start=1)
        ]

        analysis = self.risk_calculator.analyze_route(
            route_id="temporal-route",
            segments=segments,
        )

        return {
            "success": True,
            "heat_data": heat_data,
            "analysis": analysis,
            "partial": bool(errors),
            "errors": errors,
        }
