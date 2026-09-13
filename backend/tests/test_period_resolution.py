import pytest
from app.period_utils import resolve_period_name, get_period_slot_label, PERIOD_SLOT_LABELS

def test_resolve_period_name():
    # Clock timestamps
    assert resolve_period_name("13:01:57") == "Period 5"
    assert resolve_period_name("10:15:00") == "Period 2"
    assert resolve_period_name("09:30:00") == "Period 1"
    assert resolve_period_name("11:45:12") == "Period 3"
    assert resolve_period_name("12:00:00") == "Period 4"
    assert resolve_period_name("14:30:00") == "Period 6"
    assert resolve_period_name("15:59:59") == "Period 7"
    assert resolve_period_name("16:05:00") == "Period 8"
    assert resolve_period_name("08:45:00") == "Period 1"
    
    # Pre-formatted period strings
    assert resolve_period_name("Period 1") == "Period 1"
    assert resolve_period_name("Period 2") == "Period 2"
    assert resolve_period_name("Period 2 (10:00 - 11:00 AM)") == "Period 2"
    assert resolve_period_name("Period 5 (01:00 - 02:00 PM)") == "Period 5"
    assert resolve_period_name("period 3") == "Period 3"

def test_get_period_slot_label():
    assert get_period_slot_label("Period 1") == "Period 1 (09:00 - 10:00 AM)"
    assert get_period_slot_label("Period 2") == "Period 2 (10:00 - 11:00 AM)"
    assert get_period_slot_label("Period 5") == "Period 5 (01:00 - 02:00 PM)"
    assert get_period_slot_label("13:01:57") == "Period 5 (01:00 - 02:00 PM)"
    assert get_period_slot_label("10:15:00") == "Period 2 (10:00 - 11:00 AM)"
