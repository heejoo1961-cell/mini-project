import pytest


@pytest.fixture(autouse=True)
def disable_external_ai_during_tests(monkeypatch):
    """단위 테스트가 실제 외부 AI API를 호출하지 않도록 고정합니다."""
    monkeypatch.setenv("QUOTE_PARSER_MODE", "rules")
