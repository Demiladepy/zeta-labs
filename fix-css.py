
import io

with io.open("packages/dashboard/src/styles.css", "r", encoding="utf-8") as f:
    content = f.read()

target = """
.faq-question {
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  padding: 24px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font: 450 17px/1.4 "Segoe UI Variable", "Segoe UI", sans-serif;
  color: var(--ink);
  cursor: pointer;
}
""".strip()

replacement = """
.faq-question {
  width: calc(100% + 48px);
  margin: 0 -24px;
  padding: 24px;
  text-align: left;
  background: transparent;
  border: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font: 450 17px/1.4 "Segoe UI Variable", "Segoe UI", sans-serif;
  color: var(--ink);
  cursor: pointer;
  transition: background 0.3s ease;
}
.faq-question:hover {
  background: linear-gradient(90deg, rgba(166,244,197,0.3) 0%, transparent 15%, transparent 85%, rgba(166,244,197,0.3) 100%);
}
""".strip()

if target in content:
    content = content.replace(target, replacement)
    with io.open("packages/dashboard/src/styles.css", "w", encoding="utf-8") as f:
        f.write(content)
    print("Success")
else:
    print("Target not found")

