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
    )
    origin_lng = serializers.FloatField(
        min_value=-180,
        max_value=180,
    )
    destination_lat = serializers.FloatField(
        min_value=-90,
        max_value=90,
    )
    destination_lng = serializers.FloatField(
        min_value=-180,
        max_value=180,
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

    def validate(self, attrs):
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
