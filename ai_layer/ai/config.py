import os
from dataclasses import dataclass
from typing import ClassVar, Optional
from dotenv import load_dotenv
import pathlib

load_dotenv(pathlib.Path.cwd().parent / '.env' if pathlib.Path.cwd().parent.exists() else '.env')


def get_env_float(key: str, default: float) -> float:
    try:
        return float(os.getenv(key, default))
    except (ValueError, TypeError):
        return default


def get_env_int(key: str, default: int) -> int:
    try:
        return int(os.getenv(key, default))
    except (ValueError, TypeError):
        return default


@dataclass
class RiskWeights:
    temperature: float
    heat_index: float
    humidity: float
    aqi: float

    def __post_init__(self):
        total = self.temperature + self.heat_index + self.humidity + self.aqi
        if not (99.9 <= total <= 100.1):
            raise ValueError(f"RiskWeights must sum to 100, got {total}")

    @classmethod
    def from_env(cls) -> 'RiskWeights':
        return cls(
            temperature=get_env_float("RISK_WEIGHT_TEMPERATURE", 30.0),
            heat_index=get_env_float("RISK_WEIGHT_HEAT_INDEX", 35.0),
            humidity=get_env_float("RISK_WEIGHT_HUMIDITY", 15.0),
            aqi=get_env_float("RISK_WEIGHT_AQI", 20.0)
        )


@dataclass
class OptimizationWeights:
    distance: float
    duration: float
    heat_risk: float
    environmental: float

    def __post_init__(self):
        total = self.distance + self.duration + self.heat_risk + self.environmental
        if not (99.9 <= total <= 100.1):
            raise ValueError(f"OptimizationWeights must sum to 100, got {total}")

    @classmethod
    def from_env(cls) -> 'OptimizationWeights':
        return cls(
            distance=get_env_float("OPTIM_WEIGHT_DISTANCE", 20.0),
            duration=get_env_float("OPTIM_WEIGHT_DURATION", 20.0),
            heat_risk=get_env_float("OPTIM_WEIGHT_HEAT_RISK", 40.0),
            environmental=get_env_float("OPTIM_WEIGHT_ENVIRONMENTAL", 20.0)
        )


@dataclass
class RiskThresholds:
    EXTREME: int
    VERY_HIGH: int
    HIGH: int
    MODERATE: int

    @classmethod
    def from_env(cls) -> 'RiskThresholds':
        return cls(
            EXTREME=get_env_int("THRESHOLD_EXTREME", 80),
            VERY_HIGH=get_env_int("THRESHOLD_VERY_HIGH", 60),
            HIGH=get_env_int("THRESHOLD_HIGH", 40),
            MODERATE=get_env_int("THRESHOLD_MODERATE", 20)
        )


@dataclass
class NormalizationRanges:
    temperature_max: float
    heat_index_max: float
    aqi_max: float
    distance_max: float
    duration_max: float
    humidity_optimal: float

    @classmethod
    def from_env(cls) -> 'NormalizationRanges':
        return cls(
            temperature_max=get_env_float("NORM_MAX_TEMPERATURE", 50.0),
            heat_index_max=get_env_float("NORM_MAX_HEAT_INDEX", 55.0),
            aqi_max=get_env_float("NORM_MAX_AQI", 200.0),
            distance_max=get_env_float("NORM_MAX_DISTANCE", 50.0),
            duration_max=get_env_float("NORM_MAX_DURATION", 120.0),
            humidity_optimal=get_env_float("NORM_HUMIDITY_OPTIMAL", 50.0)
        )


@dataclass
class Config:
    risk_weights: RiskWeights
    optimization_weights: OptimizationWeights
    normalization: NormalizationRanges
    thresholds: RiskThresholds

    @classmethod
    def from_env(cls) -> 'Config':
        return cls(
            risk_weights=RiskWeights.from_env(),
            optimization_weights=OptimizationWeights.from_env(),
            normalization=NormalizationRanges.from_env(),
            thresholds=RiskThresholds.from_env()
        )

    @classmethod
    def default(cls) -> 'Config':
        return cls(
            risk_weights=RiskWeights(30.0, 35.0, 15.0, 20.0),
            optimization_weights=OptimizationWeights(20.0, 20.0, 40.0, 20.0),
            normalization=NormalizationRanges(50.0, 55.0, 200.0, 50.0, 120.0, 50.0),
            thresholds=RiskThresholds(80, 60, 40, 20)
        )
