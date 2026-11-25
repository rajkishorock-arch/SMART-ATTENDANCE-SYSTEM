"""Exercise the production web build with Chrome, FastAPI and a disposable SQLite database.

Run with the backend requirements and playwright installed, after npm run build.
"""
import functools
import os
from pathlib import Path
import secrets
import socket
import sys
import tempfile
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright
import uvicorn

ROOT = Path(__file__).resolve().parents[1]


def verify(directory):
    os.environ.update(DATABASE_URL="sqlite:///" + (Path(directory) / "test.db").as_posix(),
                      ENV="development", JWT_SECRET_KEY=secrets.token_hex(32),
                      PYTHON_DOTENV_DISABLED="1", REDIS_URL="", SEED_DEFAULT_USERS="false",
                      CORS_ORIGINS="http://127.0.0.1:4173", SYSTEM_OWNER_EMAIL="admin@example.org")
    sys.path.insert(0, str(ROOT / "backend"))
    from app import database, models, security
    from app.main import app

    password = secrets.token_urlsafe(18)
    database.Base.metadata.create_all(database.engine)
    with database.SessionLocal() as db:
        db.add(models.Institution(id=1, name="Test institution", slug="default"))
        db.flush()
        for role in ("student", "teacher", "admin"):
            fields = dict(name=role.title(), institution_id=1, email=f"{role}@example.org",
                          password_hash=security.get_password_hash(password))
            db.add(models.StudentModel(roll="TEST01", dep="CSE", course="BTech", semester="1",
                                       year="2026", **fields) if role == "student"
                   else models.User(role=role, **fields))
        db.commit()
    with socket.socket() as sock, ThreadingHTTPServer(("127.0.0.1", 4173), functools.partial(
            SimpleHTTPRequestHandler, directory=str(ROOT / "frontend/dist"))) as web:
        sock.bind(("127.0.0.1", 0))
        api = f"http://127.0.0.1:{sock.getsockname()[1]}/api/v1"
        server = uvicorn.Server(uvicorn.Config(app, lifespan="off", log_level="error"))
        threading.Thread(target=server.run, kwargs={"sockets": [sock]}, daemon=True).start()
        threading.Thread(target=web.serve_forever, daemon=True).start()
        try:
            for _ in range(100):
                if server.started:
                    break
                time.sleep(.05)
            with sync_playwright() as driver:
                browser = driver.chromium.launch(channel="chrome")
                for role in ("student", "teacher", "admin"):
                    context = browser.new_context(service_workers="block")
                    context.add_init_script(f"localStorage.setItem('dev_api_base_url','{api}')")
                    context.route("**/*", lambda route: route.continue_() if
                                  urlsplit(route.request.url).hostname == "127.0.0.1" else route.abort())
                    page = context.new_page()
                    errors = []
                    page.on("pageerror", lambda e: errors.append(str(e)))
                    page.on("response", lambda res: errors.append(f"{res.status} {urlsplit(res.url).path}")
                            if res.status >= 500 else None)
                    page.goto(f"http://127.0.0.1:{web.server_port}")
                    page.get_by_role("button", name=role.title(), exact=True).click()
                    page.get_by_placeholder("e.g.", exact=False).last.fill(f"{role}@example.org")
                    page.locator('input[type=password]').first.fill(password)
                    with page.expect_response(lambda res: "/auth/token" in res.url) as result:
                        page.get_by_role("button", name="Sign In as", exact=False).click()
                    assert result.value.ok, (role, result.value.status)
                    page.get_by_text("Welcome back", exact=True).wait_for(state="hidden")
                    page.wait_for_timeout(1200)
                    tabs = (["student-profile", "student-attendance"] if role == "student"
                            else ["students", "logs", "reports", "session-history", "disputes",
                                  "calendar", "settings", "dashboard"])
                    for tab in tabs:
                        page.evaluate("(tab) => { location.hash = '/' + tab }", tab)
                        page.wait_for_timeout(450)
                        assert not page.get_by_text("This screen couldn’t load").count(), (role, tab)
                    consent = page.get_by_role("button", name="I Agree", exact=True)
                    if consent.is_visible():
                        consent.click()
                    if role == "admin":
                        page.evaluate("location.hash = '/attendance'")
                        card = page.locator(".scanner-session-setup > .glass-panel")
                        card.wait_for()
                        for width in (320, 390, 440):
                            page.set_viewport_size({"width": width, "height": 956})
                            page.wait_for_function("""() => {
                                const rect = document.querySelector('.scanner-session-setup > .glass-panel').getBoundingClientRect();
                                return Math.abs(rect.left) <= 1 && Math.abs(rect.right - innerWidth) <= 1;
                            }""", timeout=3000)
                            for element, inset in ((card, 1), (card.locator("select").first, 6)):
                                box = element.bounding_box()
                                right = width - box["x"] - box["width"]
                                print(f"{width}px: {box['width']}px wide, margins {box['x']}, {right}")
                                assert abs(box["x"]) <= inset and abs(right) <= inset, box
                        page.set_viewport_size({"width": 1280, "height": 720})
                    if role == "teacher":
                        page.set_viewport_size({"width": 440, "height": 956})
                        page.evaluate("location.hash = '/attendance'")
                        setup = page.get_by_text("Initialize Attendance Session", exact=True)
                        for browser_back in (False, True):
                            setup.wait_for()
                            page.get_by_role("button", name="Start Face Scanner", exact=False).click()
                            back = page.locator(".clean-back-btn")
                            back.wait_for()
                            if browser_back:
                                page.evaluate("history.back()")
                            else:
                                back.click()
                            setup.wait_for()
                            assert page.url.endswith("#/attendance")
                        page.set_viewport_size({"width": 1280, "height": 720})
                    page.get_by_role("button", name="Sign Out", exact=True).filter(visible=True).first.click()
                    page.get_by_text("Welcome back", exact=True).wait_for()
                    assert not errors, (role, errors)
                    print(f"{role}: signed in and checked {len(tabs)} tab transitions")
                    context.close()
                browser.close()
        finally:
            server.should_exit = True
            web.shutdown()
            database.engine.dispose()


if __name__ == "__main__":
    with tempfile.TemporaryDirectory() as temp:
        verify(temp)
