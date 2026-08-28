from rest_framework import serializers
from .models import Route, RouteSegment


class RouteSegmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = RouteSegment
        fields = [
            "id",
            "route",
            "latitude",
            "longitude",
            "temperature",
            "shade_score",
            "heat_score",
            "risk_level",
        ]
        read_only_fields = ["id"]


class RouteSerializer(serializers.ModelSerializer):
    segments = RouteSegmentSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = Route
        fields = [
            "id",
            "origin",
            "destination",
            "distance",
            "duration",
            "heat_exposure_score",
            "safety_score",
            "route_type",
            "created_at",
            "segments",
        ]
        read_only_fields = [
            "id",
            "distance",
            "duration",
            "heat_exposure_score",
            "safety_score",
            "created_at",
            "segments",
        ]

    def validate_origin(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Origin cannot be empty."
            )

        return value

    def validate_destination(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Destination cannot be empty."
            )

        return value

    def validate(self, attrs):
        if (
            "origin" in attrs
            and "destination" in attrs
            and attrs["origin"].strip().lower()
            == attrs["destination"].strip().lower()
        ):
            raise serializers.ValidationError(
                "Origin and destination cannot be the same."
            )

        return attrs


class RouteAnalysisRequestSerializer(
    serializers.Serializer
):
    origin_lat = serializers.FloatField(
        min_value=-90,
        max_value=90,
        allow_null=False,
        required=False,
    )
    origin_lng = serializers.FloatField(
        min_value=-180,
        max_value=180,
        allow_null=False,
        required=False,
    )
    destination_lat = serializers.FloatField(
        min_value=-90,
        max_value=90,
        allow_null=False,
        required=False,
    )
    destination_lng = serializers.FloatField(
        min_value=-180,
        max_value=180,
        allow_null=False,
        required=False,
    )
    origin_text = serializers.CharField(
        max_length=300,
        required=False,
    )
    destination_text = serializers.CharField(
        max_length=300,
        required=False,
    )
    jurisdiction = serializers.CharField(
        max_length=10,
    )
    departure_start = serializers.DateTimeField(
        required=False,
    )
    departure_end = serializers.DateTimeField(
        required=False,
    )
    step_minutes = serializers.IntegerField(
        required=False,
        min_value=15,
        max_value=120,
        default=30,
    )
    weather_weight = serializers.FloatField(
        required=False,
        min_value=0,
        max_value=1,
        default=0.7,
    )
    time_weight = serializers.FloatField(
        required=False,
        min_value=0,
        max_value=1,
        default=0.3,
    )
    traffic_aware = serializers.BooleanField(
        required=False,
        default=False,
    )

    def validate(self, attrs):
        attrs = self._validate_endpoints(attrs)

        start = attrs.get(
            "departure_start"
        )
        end = attrs.get(
            "departure_end"
        )

        if start and end and end <= start:
            raise serializers.ValidationError(
                {
                    "departure_end": (
                        "departure_end must be after "
                        "departure_start."
                    )
                }
            )

        if start and start.tzinfo is None:
            raise serializers.ValidationError(
                {
                    "departure_start": (
                        "departure_start must include "
                        "a timezone offset."
                    )
                }
            )

        if end and end.tzinfo is None:
            raise serializers.ValidationError(
                {
                    "departure_end": (
                        "departure_end must include "
                        "a timezone offset."
                    )
                }
            )

        if (
            attrs.get("weather_weight", 0)
            + attrs.get("time_weight", 0)
            <= 0
        ):
            raise serializers.ValidationError(
                "weather_weight + time_weight must be greater than 0."
            )

        return attrs

    @staticmethod
    def _validate_endpoints(attrs):
        errors = {}

        for endpoint in ("origin", "destination"):
            lat = attrs.get(f"{endpoint}_lat")
            lng = attrs.get(f"{endpoint}_lng")
            text = str(
                attrs.get(f"{endpoint}_text", "")
            ).strip()

            has_coords = lat is not None and lng is not None
            has_text = bool(text)

            if has_coords and has_text:
                raise serializers.ValidationError(
                    {
                        f"{endpoint}_text": (
                            f"Provide either {endpoint} coordinates "
                            f"or {endpoint}_text, not both."
                        )
                    }
                )

            if not has_coords and not has_text:
                errors[endpoint] = (
                    f"Provide either {endpoint}_lat/{endpoint}_lng "
                    f"coordinates or {endpoint}_text."
                )

            if (lat is not None) != (lng is not None):
                errors[endpoint] = (
                    f"Both {endpoint}_lat and {endpoint}_lng "
                    f"must be provided together."
                )

        if errors:
            raise serializers.ValidationError(errors)

        return attrs
