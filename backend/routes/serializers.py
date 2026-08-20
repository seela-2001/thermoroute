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
    segments = RouteSegmentSerializer(many=True, read_only=True)

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
