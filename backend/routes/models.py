from django.db import models
from django.core.validators import MaxValueValidator, MinValueValidator


class Route(models.Model):
    class RouteType(models.TextChoices):
        WALKING = "walking", "Walking"
        CYCLING = "cycling", "Cycling"
        DRIVING = "driving", "Driving"

    origin = models.CharField(max_length=100)
    destination = models.CharField(max_length=100)
    distance = models.FloatField(
        validators=[MinValueValidator(0)]
    )
    duration = models.FloatField(
        validators=[MinValueValidator(0)]
    )
    heat_exposure_score = models.FloatField(
        validators=[
            MinValueValidator(0),
            MaxValueValidator(100),
        ]
    )
    safety_score = models.FloatField(
        validators=[
            MinValueValidator(0),
            MaxValueValidator(100),
        ]
    )
    route_type = models.CharField(
        max_length=20,
        choices=RouteType.choices,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Route from {self.origin} to {self.destination}"


class RouteSegment(models.Model):
    class RiskLevel(models.TextChoices):
        LOW = "LOW", "Low"
        MEDIUM = "MEDIUM", "Medium"
        HIGH = "HIGH", "High"
        EXTREME = "EXTREME", "Extreme"

    route = models.ForeignKey(
        Route,
        on_delete=models.CASCADE,
        related_name="segments",
    )
    latitude = models.FloatField(
        validators=[
            MinValueValidator(-90),
            MaxValueValidator(90),
        ]
    )
    longitude = models.FloatField(
        validators=[
            MinValueValidator(-180),
            MaxValueValidator(180),
        ]
    )
    temperature = models.FloatField()
    shade_score = models.FloatField(
        validators=[
            MinValueValidator(0),
            MaxValueValidator(100),
        ]
    )
    heat_score = models.FloatField(
        validators=[
            MinValueValidator(0),
            MaxValueValidator(100),
        ]
    )
    risk_level = models.CharField(
        max_length=10,
        choices=RiskLevel.choices,
    )

    def __str__(self):
        return f"Segment of Route {self.route.id}"
