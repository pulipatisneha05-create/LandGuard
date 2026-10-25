import os
import sys
import pytest

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.nlp.unit_converter import (
    convert_to_acres,
    convert_to_sqm,
    normalize_land_area,
    compare_areas,
    parse_area_value_and_unit
)


def test_square_yards_to_acres():
    # 240 square yards MUST NOT be 240 acres!
    acres = convert_to_acres(240, "square yards")
    expected = 240.0 / 4840.0
    assert abs(acres - expected) < 1e-6
    assert acres < 0.05
    assert acres != 240.0

    # 4840 square yards == 1 Acre
    assert abs(convert_to_acres(4840, "sq yds") - 1.0) < 1e-6


def test_guntas_to_acres():
    # 40 guntas == 1 Acre
    assert abs(convert_to_acres(40, "guntas") - 1.0) < 1e-6
    # 10 guntas == 0.25 Acres
    assert abs(convert_to_acres(10, "Guntas") - 0.25) < 1e-6


def test_cents_to_acres():
    # 100 cents == 1 Acre
    assert abs(convert_to_acres(100, "cents") - 1.0) < 1e-6
    # 50 cents == 0.5 Acres
    assert abs(convert_to_acres(50, "Cents") - 0.5) < 1e-6


def test_hectares_to_acres():
    # 1 hectare = 2.47105... acres
    acres = convert_to_acres(1.0, "hectares")
    assert abs(acres - 2.47105381) < 1e-4


def test_square_feet_to_acres():
    # 43560 sq ft == 1 Acre
    assert abs(convert_to_acres(43560, "sq ft") - 1.0) < 1e-6


def test_parse_area_value_and_unit():
    val, unit_raw, unit_key = parse_area_value_and_unit("240 square yards")
    assert val == 240.0
    assert unit_raw == "square yards"
    assert unit_key == "square yards"

    val2, unit_raw2, unit_key2 = parse_area_value_and_unit("1,250.75 Sq. Yds")
    assert val2 == 1250.75
    assert "yds" in unit_key2


def test_normalize_land_area():
    norm = normalize_land_area(240, "square yards")
    assert norm["raw_value"] == 240
    assert norm["raw_unit"] == "square yards"
    assert norm["normalized_acres"] == 0.0496
    assert norm["normalized_sqm"] == round(0.0495867 * 4046.8564, 2)
    assert norm["is_reliable"] is True


def test_compare_areas_cross_units():
    # 4840 sq yards vs 1.0 Acre -> should MATCH within tolerance
    res = compare_areas(4840, "sq yds", 1.0, "Acres", tolerance_pct=1.0)
    assert res["match"] is True
    assert res["discrepancy_pct"] < 0.1

    # 240 sq yards vs 2.45 Acres -> massive mismatch
    res2 = compare_areas(240, "square yards", 2.45, "Acres", tolerance_pct=5.0)
    assert res2["match"] is False
    assert res2["discrepancy_pct"] > 90.0


def test_round_trip_and_tolerance_checks():
    """
    Round-trip and tolerance tests across Indian & standard land measurement units:
    Square Yards, Square Feet, Acres, and Hectares.
    """
    # 1. Square Yards Round-Trip
    initial_sqyd = 240.0
    acres_from_sqyd = convert_to_acres(initial_sqyd, "square yards")
    # 1 acre = 4840 sq yards
    sqyd_recovered = acres_from_sqyd * 4840.0
    assert abs(sqyd_recovered - initial_sqyd) < 1e-4
    assert abs(acres_from_sqyd - 0.0495867) < 1e-5

    # Tolerance check: 240 sq yards compared to 0.0496 acres is within 0.1% tolerance
    res_sqyd = compare_areas(initial_sqyd, "square yards", 0.04959, "acres", tolerance_pct=1.0)
    assert res_sqyd["match"] is True

    # 2. Square Feet Round-Trip
    initial_sqft = 21780.0  # Exactly 0.5 Acre
    acres_from_sqft = convert_to_acres(initial_sqft, "square feet")
    sqft_recovered = acres_from_sqft * 43560.0
    assert abs(sqft_recovered - initial_sqft) < 1e-4
    assert abs(acres_from_sqft - 0.50) < 1e-6

    res_sqft = compare_areas(initial_sqft, "sq ft", 0.50, "acres", tolerance_pct=0.5)
    assert res_sqft["match"] is True

    # 3. Acres Identity & Round-Trip
    initial_acres = 3.50
    acres_converted = convert_to_acres(initial_acres, "acres")
    assert abs(acres_converted - initial_acres) < 1e-9
    res_acres = compare_areas(initial_acres, "acres", 3.50, "acres", tolerance_pct=0.1)
    assert res_acres["match"] is True

    # 4. Hectares Round-Trip
    initial_hectares = 2.0
    acres_from_ha = convert_to_acres(initial_hectares, "hectares")
    ha_recovered = acres_from_ha / 2.47105381
    assert abs(ha_recovered - initial_hectares) < 1e-4
    assert abs(acres_from_ha - 4.9421) < 1e-3

    res_ha = compare_areas(initial_hectares, "hectare", 4.9421, "acres", tolerance_pct=0.5)
    assert res_ha["match"] is True

    # 5. Raw Value & Unit Preservation (Never label 240 as acres)
    norm = normalize_land_area(240, "Square Yards")
    assert norm["raw_value"] == 240
    assert norm["raw_unit"] == "Square Yards"
    assert norm["normalized_acres"] != 240.0
    assert norm["normalized_acres"] == round(240.0 / 4840.0, 4)

