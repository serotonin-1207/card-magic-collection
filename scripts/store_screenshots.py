"""스토어용 휴대폰 스크린샷을 만든다. 실행: python scripts/store_screenshots.py (playwright 필요, www/ 먼저 생성)"""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "store" / "screenshots"
PAGE = (ROOT / "www" / "index.html").as_uri()

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 360, "height": 780}, device_scale_factor=3, is_mobile=True, has_touch=True, locale="ko-KR")
    page = ctx.new_page()
    OUT.mkdir(parents=True, exist_ok=True)

    def open_route(route):
        page.goto("about:blank")
        page.goto(f"{PAGE}#{route}")
        page.wait_for_selector("#view > *")
        page.evaluate("document.fonts.ready")

    def stop_at(frame_index):
        """재생을 멈추고 원하는 장면을 띄운다."""
        page.click("#toggle")
        for _ in range(frame_index):
            page.wait_for_timeout(50)

    def shot(name):
        page.wait_for_timeout(900)
        page.screenshot(path=str(OUT / f"{name}.png"))
        print(name)

    open_route("home")
    page.click('[data-deck="hwatu"]')
    page.evaluate("window.scrollTo(0, 0)")
    shot("1-home")

    open_route("t-hw-think-month")
    page.wait_for_timeout(2500)
    page.click("#toggle")
    shot("2-hwatu-show")

    open_route("t-four-aces")
    page.click('.tabs [data-tab="learn"]')
    page.click('[data-step="3"]')
    page.wait_for_timeout(3200)
    shot("3-learn")

    open_route("lab21")
    shot("4-lab-21")

    open_route("labmonth")
    page.click("[data-begin]")
    for ans in (1, 1, 1, 0):
        page.click(f'[data-ans="{ans}"]')
    shot("5-lab-month")

    open_route("t-clock")
    page.wait_for_timeout(8200)
    page.click("#toggle")
    shot("6-clock")
    browser.close()
