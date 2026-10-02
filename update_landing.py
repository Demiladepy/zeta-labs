
import io

with io.open("packages/dashboard/src/Landing.tsx", "r", encoding="utf-8") as f:
    content = f.read()

import_statement = """import { HeroMascot } from "./HeroMascot.js";
import { FlipFadeHeroText } from "./FlipFadeText.js";"""
content = content.replace("import { HeroMascot } from \"./HeroMascot.js\";", import_statement)

target = """<h1 id="landing-title">Credit for agents.<br />Control for humans.</h1>"""
replacement = """<FlipFadeHeroText />"""
if target in content:
    content = content.replace(target, replacement)
    with io.open("packages/dashboard/src/Landing.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("Success")
else:
    print("Target not found")

