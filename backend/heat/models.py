from django.db import models

# Create your models here.

class HeatData(models.Model):
    """
    Model representing heat data.
    """ 
    class HeatRiskLevel(models.TextChoices):
        LOW = 'LOW', 'Low'
        MODERATE = 'MODERATE', 'Moderate'
        HIGH = 'HIGH', 'High'
        EXTREME = 'EXTREME', 'Extreme'

    location = models.CharField(max_length=100)
    latitude = models.FloatField()
    longitude = models.FloatField()
    temperature = models.FloatField()
    humidity = models.FloatField()
    feels_like = models.FloatField()
    wind_speed = models.FloatField()
    timestamp = models.DateTimeField(auto_now_add=True)
    heat_risk_level = models.CharField(max_length=10, choices=HeatRiskLevel.choices, default=HeatRiskLevel.LOW)
    

    def __str__(self):
        return f"HeatData at {self.location} ({self.latitude}, {self.longitude}) - Temp: {self.temperature}°C, Risk Level: {self.heat_risk_level}"
