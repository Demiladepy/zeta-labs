
import io

with io.open("packages/dashboard/src/Landing.tsx", "r", encoding="utf-8") as f:
    content = f.read()

target = """              style={{
                left: `${(p.c / p.cols) * 100}%`,
                top: `${(p.r / p.rows) * 100}%`,
                opacity: 0.3 + Math.random() * 0.7,
              }}"""
replacement = """              style={{
                left: `${(p.c / p.cols) * 100}%`,
                top: `${(p.r / p.rows) * 100}%`,
                animationDelay: `${Math.random() * 4}s`,
                animationDuration: `${3 + Math.random() * 3}s`,
              }}"""

if target in content:
    content = content.replace(target, replacement)
    with io.open("packages/dashboard/src/Landing.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("JSX updated")
else:
    print("Target not found in JSX")

with io.open("packages/dashboard/src/styles.css", "r", encoding="utf-8") as f:
    css_content = f.read()

css_target = """
.testimonial-pixel {
  position: absolute;
  width: 8px;
  height: 8px;
  background: var(--mint);
}
""".strip()

css_replacement = """
@keyframes pixelTwinkle {
  0%, 100% { opacity: 0.1; transform: scale(0.85); }
  50% { opacity: 0.9; transform: scale(1.1); box-shadow: 0 0 8px var(--mint); }
}
.testimonial-pixel {
  position: absolute;
  width: 8px;
  height: 8px;
  background: var(--mint);
  animation: pixelTwinkle 4s infinite ease-in-out;
  will-change: opacity, transform;
}
""".strip()

if css_target in css_content:
    css_content = css_content.replace(css_target, css_replacement)
    with io.open("packages/dashboard/src/styles.css", "w", encoding="utf-8") as f:
        f.write(css_content)
    print("CSS updated")
else:
    print("Target not found in CSS")


