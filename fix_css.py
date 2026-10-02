
import io
with io.open("packages/dashboard/src/styles.css", "r", encoding="utf-8") as f:
    css = f.read()

css_target = ".landing-button-outline:hover { border-color: var(--mint); color: var(--mint) !important; }"
css_replacement = """.landing-button-outline:hover { border-color: var(--mint); color: var(--mint) !important; }

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
  box-shadow: 0 0 0 var(--ink) !important;
  transform: translate(2px, 2px) !important;
}
"""

if css_target in css:
    css = css.replace(css_target, css_replacement)
    with io.open("packages/dashboard/src/styles.css", "w", encoding="utf-8") as f:
        f.write(css)
    print("CSS updated")
else:
    print("CSS Target not found")

