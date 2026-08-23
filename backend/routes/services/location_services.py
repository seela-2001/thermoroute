from typing import Any
import os
import requests


class LocationService:
    BASE_URL = (
        "https://api.geoapify.com/v1/geocode/autocomplete"
    )

    DEFAULT_LIMIT = 5
    DEFAULT_TIMEOUT = 5
    DEFAULT_LANGUAGE = "en"
    DEFAULT_COUNTRY = "eg"

    def __init__(
        self,
        timeout: int = DEFAULT_TIMEOUT,
    ):
        self.timeout = timeout
        self.api_key = os.getenv("GEOAPIFY_API_KEY")

        self.session = requests.Session()

        self.session.headers.update(
            {
                "User-Agent": "ThermoRoute/1.0",
                "Accept": "application/json",
            }
        )

    def autocomplete(
        self,
        text: str,
        limit: int = DEFAULT_LIMIT,
        language: str = DEFAULT_LANGUAGE,
        country: str = DEFAULT_COUNTRY,
        bias_lat: float | None = None,
        bias_lon: float | None = None,
    ) -> dict[str, Any]:

        text = text.strip()

        if not text:
            return {
                "success": True,
                "results": [],
            }

        if not self.api_key:
            return {
                "success": False,
                "results": [],
                "error": "GEOAPIFY_API_KEY is not configured",
            }

        limit = max(1, min(limit, 10))

        params = {
            "text": text,
            "format": "json",
            "limit": limit,
            "lang": language,
            "filter": f"countrycode:{country}",
            "apiKey": self.api_key,
        }

        if (
            bias_lat is not None
            and bias_lon is not None
        ):
            params["bias"] = (
                f"proximity:{bias_lon},{bias_lat}"
            )

        try:
            response = self.session.get(
                self.BASE_URL,
                params=params,
                timeout=self.timeout,
            )

            response.raise_for_status()

            data = response.json()

            return {
                "success": True,
                "results": self._parse_results(
                    data
                ),
            }

        except requests.Timeout:
            return {
                "success": False,
                "results": [],
                "error": "Geoapify autocomplete timeout",
            }

        except requests.ConnectionError:
            return {
                "success": False,
                "results": [],
                "error": (
                    "Unable to connect to "
                    "Geoapify autocomplete API"
                ),
            }

        except requests.HTTPError as exc:
            return {
                "success": False,
                "results": [],
                "error": str(exc),
            }

        except ValueError:
            return {
                "success": False,
                "results": [],
                "error": (
                    "Geoapify returned invalid JSON"
                ),
            }

    @staticmethod
    def _parse_results(
        data: dict[str, Any],
    ) -> list[dict[str, Any]]:

        results = data.get(
            "results",
            [],
        )

        parsed = []

        for result in results:
            lat = result.get("lat")
            lon = result.get("lon")

            if lat is None or lon is None:
                continue

            parsed.append(
                {
                    "name": result.get(
                        "name"
                    ),
                    "formatted": result.get(
                        "formatted"
                    ),
                    "lat": lat,
                    "lon": lon,
                    "result_type": result.get(
                        "result_type"
                    ),
                    "city": result.get(
                        "city"
                    ),
                    "state": result.get(
                        "state"
                    ),
                    "country": result.get(
                        "country"
                    ),
                    "country_code": result.get(
                        "country_code"
                    ),
                    "postcode": result.get(
                        "postcode"
                    ),
                    "street": result.get(
                        "street"
                    ),
                    "housenumber": result.get(
                        "housenumber"
                    ),
                    "address_line1": result.get(
                        "address_line1"
                    ),
                    "address_line2": result.get(
                        "address_line2"
                    ),
                    "confidence": (
                        result.get(
                            "rank",
                            {},
                        ).get(
                            "confidence"
                        )
                    ),
                }
            )

        return parsed
