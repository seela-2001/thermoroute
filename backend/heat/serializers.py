from rest_framework import serializers
from .models import HeatData


class HeatDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = HeatData
        fields = [
            "id",
            "location",
            "latitude",
            "longitude",
            "temperature",
            "humidity",
            "feels_like",
            "wind_speed",
            "timestamp",
            "heat_risk_level",
        ]
        read_only_fields = [
            "id",
            "feels_like",
            "heat_risk_level",
            "timestamp",
        ]

    def validate_latitude(self, value):
        if not -90 <= value <= 90:
            raise serializers.ValidationError(
                "Latitude must be between -90 and 90."
            )
        return value

    def validate_longitude(self, value):
        if not -180 <= value <= 180:
            raise serializers.ValidationError(
                "Longitude must be between -180 and 180."
            )
        return value

    def validate_temperature(self, value):
        if value < -80 or value > 70:
            raise serializers.ValidationError(
                "Temperature must be between -80°C and 70°C."
            )
        return value

    def validate_humidity(self, value):
        if not 0 <= value <= 100:
            raise serializers.ValidationError(
                "Humidity must be between 0% and 100%."
            )
        return value

    def validate_feels_like(self, value):
        if value < -80 or value > 80:
            raise serializers.ValidationError(
                "Feels-like temperature must be between -80°C and 80°C."
            )
        return value

    def validate_wind_speed(self, value):
        if value < 0:
            raise serializers.ValidationError(
                "Wind speed cannot be negative."
            )
        return value
