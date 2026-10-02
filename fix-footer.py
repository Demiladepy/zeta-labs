
import io
with io.open("packages/dashboard/src/Landing.tsx", "r", encoding="utf-8") as f:
    content = f.read()
content = content.replace("zeta-character-footer${", "zeta-character-footer reveal${")
with io.open("packages/dashboard/src/Landing.tsx", "w", encoding="utf-8") as f:
    f.write(content)

