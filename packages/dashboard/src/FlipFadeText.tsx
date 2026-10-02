import { useMemo, memo } from "react"
import { motion } from "framer-motion"

const Letter = memo(function Letter({ char }: { char: string }) {
    return (
        <motion.span
            style={{ transformStyle: "preserve-3d" }}
            variants={{
                initial: {
                    rotateX: 90,
                    y: 20,
                    opacity: 0,
                    filter: "blur(8px)",
                },
                animate: {
                    rotateX: 0,
                    y: 0,
                    opacity: 1,
                    filter: "blur(0px)",
                    transition: {
                        duration: 0.6,
                        ease: [0.2, 0.65, 0.3, 0.9],
                    },
                },
            }}
            className="inline-block"
        >
            {char === " " ? "\u00A0" : char}
        </motion.span>
    )
})

export function FlipFadeHeroText() {
    const text1 = "Credit for agents."
    const text2 = "Control for humans."
    
    const letters1 = useMemo(() => text1.split(""), [text1])
    const letters2 = useMemo(() => text2.split(""), [text2])

    return (
        <motion.h1
            id="landing-title"
            style={{ perspective: "1000px" }}
            initial="initial"
            animate="animate"
            variants={{
                initial: { opacity: 1 },
                animate: {
                    opacity: 1,
                    transition: {
                        staggerChildren: 0.04,
                    },
                },
            }}
        >
            <span style={{ display: "inline-block" }}>
                {letters1.map((char, i) => (
                    <Letter key={`l1-${i}`} char={char} />
                ))}
            </span>
            <br />
            <span style={{ display: "inline-block" }}>
                {letters2.map((char, i) => (
                    <Letter key={`l2-${i}`} char={char} />
                ))}
            </span>
        </motion.h1>
    )
}

