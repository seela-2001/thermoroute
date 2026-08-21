from thermoroute.ai_layer.services import RiskCalculator


class HeatOpsService:

    def __init__(self):
        self.calculator = RiskCalculator()

    def analyze_route(
        self,
        route_id,
        segments,
    ):
        result = self.calculator.analyze_route(
            route_id=route_id,
            segments=segments,
        )

        return {
            "route_id": result.route_id,
            "risk_score": result.overall_risk_score,
            "risk_level": result.risk_level,
            "critical_segments": result.critical_segments,
            "metrics": result.metrics,
        }
