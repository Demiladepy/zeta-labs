
import io
with io.open("packages/dashboard/src/Landing.tsx", "r", encoding="utf-8") as f:
    content = f.read()

target = """          <div className="landing-trusted-logos">
            <div className="trusted-logo">Axiom AI</div>
            <div className="trusted-logo">Spectro Labs</div>
            <div className="trusted-logo">ChainFlip</div>
            <div className="trusted-logo">Neon DAO</div>
            <div className="trusted-logo">Primer</div>
          </div>"""

replacement = """          <div className="landing-trusted-logos-wrapper">
            <div className="landing-trusted-logos">
              <div className="trusted-logo">Axiom AI</div>
              <div className="trusted-logo">Spectro Labs</div>
              <div className="trusted-logo">ChainFlip</div>
              <div className="trusted-logo">Neon DAO</div>
              <div className="trusted-logo">Primer</div>
              <div className="trusted-logo">Axiom AI</div>
              <div className="trusted-logo">Spectro Labs</div>
              <div className="trusted-logo">ChainFlip</div>
              <div className="trusted-logo">Neon DAO</div>
              <div className="trusted-logo">Primer</div>
            </div>
          </div>"""

if target in content:
    content = content.replace(target, replacement)
    with io.open("packages/dashboard/src/Landing.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("Success")
else:
    print("Not found! Here is the actual string:")
    idx = content.find("Axiom AI")
    print(repr(content[idx-100:idx+200]))

