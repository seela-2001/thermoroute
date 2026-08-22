from ai.fortyguard_service import FortyGuardService


class HeatDataService:

    def __init__(self):
        self.fortyguard = FortyGuardService(
            load_from_parent_env=False
        )

    def get_route_heat(
        self,
        route_geometry: list[dict[str, float]],
        start_date: str | None = None,
        start_time: str | None = None,
    ):
        return self.fortyguard.get_route_heat(
            route_geometry=route_geometry,
            start_date=start_date,
            start_time=start_time,
        )
