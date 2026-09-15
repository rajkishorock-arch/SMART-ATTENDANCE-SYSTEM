"""
conftest.py — Shared test infrastructure for the backend test suite.

Provides autouse fixtures that guarantee clean app state between test files,
preventing cross-test contamination of app.dependency_overrides and
SQLAlchemy session state.
"""
import pytest
from app.main import app


@pytest.fixture(autouse=True)
def ensure_clean_dependency_overrides():
    """
    Autouse fixture: clears app.dependency_overrides before AND after every
    test function.  This prevents a test file that sets overrides but fails
    mid-teardown from leaking stale DB sessions into subsequent test files.

    Each test file still manages its own overrides inside its own fixtures;
    this is a safety net only.
    """
    # Clear any overrides left over from a previous test
    app.dependency_overrides.clear()
    yield
    # Always clear after the test, even if it errors or fails
    app.dependency_overrides.clear()
