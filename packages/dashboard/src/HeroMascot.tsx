import { useEffect, useRef } from "react";
import "./HeroMascot.css";

export function HeroMascot() {
  const mascotRef = useRef<HTMLButtonElement>(null);
  const reactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const mascot = mascotRef.current;
    const hero = mascot?.closest(".landing-hero");
    if (!mascot || !hero) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reset = () => {
      mascot.style.setProperty("--baby-tilt", "0deg");
      mascot.style.setProperty("--baby-eye-x", "0px");
      mascot.style.setProperty("--baby-eye-y", "0px");
    };
    const follow = (event: Event) => {
      const pointer = event as PointerEvent;
      if (preference.matches || pointer.pointerType === "touch") return;
      const box = mascot.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, (pointer.clientX - box.left - box.width / 2) / 350));
      const y = Math.max(-1, Math.min(1, (pointer.clientY - box.top - box.height / 3) / 300));
      mascot.style.setProperty("--baby-tilt", `${x * 3}deg`);
      mascot.style.setProperty("--baby-eye-x", `${x * 3}px`);
      mascot.style.setProperty("--baby-eye-y", `${y * 2}px`);
    };
    const syncPreference = () => { if (preference.matches) reset(); };
    hero.addEventListener("pointermove", follow);
    hero.addEventListener("pointerleave", reset);
    preference.addEventListener("change", syncPreference);
    const observer = new IntersectionObserver(([entry]) => {
      mascot.classList.toggle("baby-is-visible", entry.isIntersecting);
    });
    observer.observe(mascot);
    return () => {
      hero.removeEventListener("pointermove", follow);
      hero.removeEventListener("pointerleave", reset);
      preference.removeEventListener("change", syncPreference);
      observer.disconnect();
      if (reactionTimer.current) clearTimeout(reactionTimer.current);
    };
  }, []);

  const bounce = () => {
    const mascot = mascotRef.current;
    if (!mascot || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (reactionTimer.current) clearTimeout(reactionTimer.current);
    mascot.classList.remove("baby-is-delighted");
    void mascot.offsetWidth;
    mascot.classList.add("baby-is-delighted");
    reactionTimer.current = setTimeout(() => mascot.classList.remove("baby-is-delighted"), 850);
  };

  return (
    <button ref={mascotRef} className="hero-baby" type="button" onClick={bounce} aria-label="Make the baby Zeta mascot bounce">
      <span className="baby-arrival">
        <span className="baby-breathe">
          <span className="baby-look">
            <img src="/zeta-baby-guardian.png" alt="" width="1024" height="1024" fetchPriority="high" draggable={false} />
            <span className="baby-visor" aria-hidden="true"><i className="baby-eye baby-eye-left" /><i className="baby-eye baby-eye-right" /></span>
          </span>
        </span>
      </span>
    </button>
  );
}
