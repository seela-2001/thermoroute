from typing import Any

_RISK_ORDER = {"EXTREME": 4, "HIGH": 3, "MODERATE": 2, "LOW": 1, "UNKNOWN": 0}
_TYPE_PRIORITY = {"shade": 4, "indoor": 3, "water": 2, "gas_station": 1, "hospital": 1}
_TYPE_LABEL = {
    "shade": "shaded area",
    "indoor": "indoor stop",
    "water": "water/hydration stop",
    "gas_station": "gas station",
    "hospital": "medical facility",
}


class StopSuggesterAgent:
    """Suggests cooling stops from route heat data and POIs — no LLM required."""

    MAX_STOPS = 3
    WINDOW_METERS = 20_000

    def suggest(
        self,
        heat_data: list[dict[str, Any]],
        pois: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        if not heat_data or not pois:
            return []

        high_risk = [
            p for p in heat_data
            if _RISK_ORDER.get(p.get("risk_level", ""), 0) >= 3
        ]
        if not high_risk:
            return []

        used: set[str] = set()
        stops: list[dict[str, Any]] = []

        for hp in high_risk:
            hp_dist = hp.get("distance_from_origin_m")
            if hp_dist is None:
                continue

            nearby = [
                poi for poi in pois
                if poi.get("distance") is not None
                and abs(poi["distance"] * 1000 - hp_dist) <= self.WINDOW_METERS
                and (poi.get("name") or poi.get("id", "")) not in used
            ]
            if not nearby:
                continue

            nearby.sort(
                key=lambda p: _TYPE_PRIORITY.get(p.get("type", ""), 0),
                reverse=True,
            )
            best = nearby[0]
            poi_key = best.get("name") or best.get("id") or f"{best.get('lat')},{best.get('lon')}"
            used.add(poi_key)

            stops.append({
                "type": best.get("type", "gas_station"),
                "name": poi_key,
                "lat": best.get("lat"),
                "lon": best.get("lon"),
                "distance_km": round((hp_dist or 0) / 1000, 1),
                "eta_time": hp.get("eta", ""),
                "message": self._message(best, hp),
            })

            if len(stops) >= self.MAX_STOPS:
                break

        return stops

    @staticmethod
    def _fmt_eta(iso: str) -> str:
        if not iso:
            return "this point"
        try:
            from datetime import datetime
            dt = datetime.fromisoformat(str(iso).replace("Z", "+00:00"))
            h = dt.hour % 12 or 12
            period = "AM" if dt.hour < 12 else "PM"
            return f"{h}:{dt.minute:02d} {period}"
        except Exception:
            return iso

    @staticmethod
    def _message(poi: dict[str, Any], hp: dict[str, Any]) -> str:
        temp_c = hp.get("temperature") or 0
        hi_c = hp.get("heat_index") or temp_c
        risk = hp.get("risk_level", "HIGH")
        eta = StopSuggesterAgent._fmt_eta(hp.get("eta", ""))
        poi_type = poi.get("type", "gas_station")
        label = _TYPE_LABEL.get(poi_type, "stop").capitalize()

        temp_f = round(temp_c * 9 / 5 + 32)
        hi_f = round(hi_c * 9 / 5 + 32)

        if risk == "EXTREME":
            return (
                f"{label} — heat index {hi_f}°F at {eta}. "
                "Take a break here before continuing."
            )
        return (
            f"{label} recommended — temperature reaches {temp_f}°F "
            f"at {eta}."
        )
