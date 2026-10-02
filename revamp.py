
import io

with io.open("packages/dashboard/src/styles.css", "r", encoding="utf-8") as f:
    css = f.read()

target = """.integration-journey { min-height: 330px; padding: clamp(26px, 4vw, 52px); border: 1px solid #83c99f; border-radius: 12px; background: rgba(244, 255, 247, .55); overflow: hidden; }
.integration-journey-head { display: grid; gap: 8px; }
.integration-journey-head > span { color: #466f55; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.integration-journey-head strong { color: var(--ink); font-size: clamp(24px, 3vw, 38px); letter-spacing: -.045em; }
.integration-journey-head p { max-width: 520px; margin: 0; color: #4b6a55; font-size: 14px; line-height: 1.5; }
.integration-journey-track { position: relative; height: 2px; margin: 52px 8% 0; background: #75b88f; }
.journey-pulse { position: absolute; top: -6px; width: 14px; height: 14px; border: 3px solid #ecfff2; border-radius: 50%; background: #17623b; box-shadow: 0 0 0 4px rgba(23, 98, 59, .12); animation: journey-pulse 6s cubic-bezier(.16, 1, .3, 1) infinite; }
.integration-journey-stages { position: relative; z-index: 1; margin-top: -24px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 26px; }
.integration-journey-stages > div { display: grid; justify-items: center; gap: 7px; text-align: center; }
.integration-journey-stages > div > span { width: 48px; height: 48px; border: 1px solid #75b88f; border-radius: 50%; display: grid; place-items: center; background: #d8f5e1; color: #17623b; font-size: 21px; }
.integration-journey-stages strong { color: var(--ink); font-size: 14px; }
.integration-journey-stages small { color: #53725d; font-size: 11px; }"""

replacement = """.integration-journey {
  min-height: 330px;
  padding: clamp(32px, 4vw, 52px);
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  position: relative;
}
.integration-journey-head { display: grid; gap: 12px; }
.integration-journey-head > span {
  justify-self: flex-start;
  color: var(--forest);
  background: #eef7f1;
  padding: 4px 12px;
  border-radius: 24px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.integration-journey-head strong { color: var(--ink); font-size: clamp(28px, 3.5vw, 42px); letter-spacing: -.03em; line-height: 1.1; font-family: "Segoe UI Variable", "Segoe UI", sans-serif; }
.integration-journey-head p { max-width: 520px; margin: 0; color: #626c64; font-size: 15px; line-height: 1.6; }
.integration-journey-track { position: relative; height: 2px; margin: 64px 8% 0; background: linear-gradient(90deg, transparent, #a2d7b5 15%, #a2d7b5 85%, transparent); }
.journey-pulse { position: absolute; top: -7px; width: 16px; height: 16px; border-radius: 50%; background: var(--mint); box-shadow: 0 0 16px var(--mint), 0 0 0 4px rgba(166, 244, 197, 0.3); animation: journey-pulse 4s cubic-bezier(.3, 0, .7, 1) infinite; }
.integration-journey-stages { position: relative; z-index: 1; margin-top: -28px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 26px; }
.integration-journey-stages > div { display: grid; justify-items: center; gap: 12px; text-align: center; }
.integration-journey-stages > div > span { width: 56px; height: 56px; border: 1px solid #e1e8e3; border-radius: 50%; display: grid; place-items: center; background: #ffffff; color: var(--forest); font-size: 24px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); transition: transform 0.3s ease, box-shadow 0.3s ease; }
.integration-journey-stages > div:hover > span { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08); border-color: var(--mint); color: var(--mint); }
.integration-journey-stages strong { color: var(--ink); font-size: 16px; font-weight: 600; letter-spacing: -0.01em; }
.integration-journey-stages small { color: #6e7a71; font-size: 13px; line-height: 1.4; max-width: 140px; }"""

if target in css:
    css = css.replace(target, replacement)
    with io.open("packages/dashboard/src/styles.css", "w", encoding="utf-8") as f:
        f.write(css)
    print("Replaced!")
else:
    print("Not found! Here is the block from the file:")
    idx = css.find(".integration-journey {")
    print(css[idx:idx+1000])


