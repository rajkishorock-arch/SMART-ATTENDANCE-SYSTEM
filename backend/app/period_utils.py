import re
from datetime import datetime, timezone, timedelta
from typing import Optional

IST = timezone(timedelta(hours=5, minutes=30))

PERIOD_SLOT_LABELS = {
    "Period 1": "Period 1 (09:00 - 10:00 AM)",
    "Period 2": "Period 2 (10:00 - 11:00 AM)",
    "Period 3": "Period 3 (11:00 - 12:00 PM)",
    "Period 4": "Period 4 (12:00 - 01:00 PM)",
    "Period 5": "Period 5 (01:00 - 02:00 PM)",
    "Period 6": "Period 6 (02:00 - 03:00 PM)",
    "Period 7": "Period 7 (03:00 - 04:00 PM)",
    "Period 8": "Period 8 (04:00 - 05:00 PM)",
}

def _hour_to_period(hour: int) -> str:
    """Map clock hour (0-23) to standard college period slots."""
    if hour < 10:
        return "Period 1"
    elif hour == 10:
        return "Period 2"
    elif hour == 11:
        return "Period 3"
    elif hour == 12:
        return "Period 4"
    elif hour == 13:
        return "Period 5"
    elif hour == 14:
        return "Period 6"
    elif hour == 15:
        return "Period 7"
    else:
        return "Period 8"

def resolve_period_name(time_str: Optional[str]) -> str:
    """
    Normalizes any time string (e.g. 'Period 2', 'Period 2 (10:00 - 11:00 AM)', 
    '10:15:30', '13:01:57', '01:05 PM') to standard 'Period X'.
    If time_str is None or empty, resolves to current IST hour period.
    """
    if not time_str:
        now = datetime.now(IST)
        return _hour_to_period(now.hour)
        
    t_clean = str(time_str).strip()
    
    # Check if already starts with Period X (e.g., 'Period 1', 'Period 2 (10:00 - 11:00 AM)')
    m = re.match(r"(Period\s*\d+)", t_clean, re.IGNORECASE)
    if m:
        num = re.search(r"\d+", m.group(1))
        if num:
            return f"Period {num.group(0)}"
        return m.group(1)
        
    # Check if timestamp format HH:MM:SS or HH:MM or AM/PM
    for fmt in ("%H:%M:%S", "%H:%M", "%I:%M:%S %p", "%I:%M %p", "%H:%M:%S.%f"):
        try:
            parsed = datetime.strptime(t_clean, fmt)
            return _hour_to_period(parsed.hour)
        except ValueError:
            continue
            
    # If it's a simple number like "1" or "2"
    if t_clean.isdigit():
        val = int(t_clean)
        if 1 <= val <= 8:
            return f"Period {val}"
            
    # Fallback to current period
    now = datetime.now(IST)
    return _hour_to_period(now.hour)

def get_period_slot_label(period_or_time: Optional[str]) -> str:
    """Returns human-readable time slot label for any period or timestamp."""
    p_name = resolve_period_name(period_or_time)
    return PERIOD_SLOT_LABELS.get(p_name, p_name)
