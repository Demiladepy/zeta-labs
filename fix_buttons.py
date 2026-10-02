
import io

with io.open("packages/dashboard/src/Landing.tsx", "r", encoding="utf-8") as f:
    content = f.read()

target = """          <div className="developer-actions">
            <button className="landing-button landing-button-primary" type="button" onClick={onOpenDashboard}>
              <span>Open dashboard</span><ArrowRightRegular />
            </button>
            <a href="/docs">Read the SDK guide</a>
          </div>"""
replacement = """          <div className="developer-actions">
            <button className="landing-button landing-button-primary dev-action-btn" type="button" onClick={onOpenDashboard}>
              <span>Open dashboard</span><ArrowRightRegular />
            </button>
            <a className="landing-button landing-button-outline-dark" href="/docs">
              <span>Read the SDK guide</span>
            </a>
          </div>"""

if target in content:
    content = content.replace(target, replacement)
    with io.open("packages/dashboard/src/Landing.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("JSX updated")
else:
    print("JSX Target not found")

with io.open("packages/dashboard/src/styles.css", "r", encoding="utf-8") as f:
    css = f.read()

css_target = ".landing-button-outline:hover { background: rgba(255,255,255,.05); }"
css_replacement = """.landing-button-outline:hover { background: rgba(255,255,255,.05); }

.landing-button-outline-dark {
  color: var(--ink) !important;
  background: transparent;
  border-color: var(--ink) !important;
  font-weight: 500;
}
.landing-button-outline-dark:hover {
  background: rgba(0, 0, 0, 0.05);
}

.developer-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 48px;
}
.dev-action-btn {
  border: 1px solid var(--ink) !important;
  box-shadow: 2px 2px 0 var(--ink);
}
.dev-action-btn:active {
  box-shadow: 0 0 0 var(--ink);
  transform: translate(2px, 2px);
}
"""

if css_target in css:
    css = css.replace(css_target, css_replacement)
    with io.open("packages/dashboard/src/styles.css", "w", encoding="utf-8") as f:
        f.write(css)
    print("CSS updated")
else:
    print("CSS Target not found")


