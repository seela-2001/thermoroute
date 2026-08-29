import { motion, type Transition, useReducedMotion } from "framer-motion";

interface MascotCharacterProps {
  state?: "idle" | "thinking" | "happy" | "wave" | "sad";
  size?: number;
}

export function MascotCharacter({ state = "idle", size = 80 }: MascotCharacterProps) {
  const shouldReduceMotion = useReducedMotion();
  const thinkingDots = [0, 1, 2];

  const idleTransition: Transition = { duration: 2.5, repeat: Infinity, ease: "easeInOut" };
  const thinkingTransition: Transition = { duration: 1.2, repeat: Infinity, ease: "easeInOut" };
  const happyTransition: Transition = { duration: 0.6, repeat: Infinity, repeatDelay: 0.8, ease: "easeOut" };
  const waveTransition: Transition = { duration: 0.8, repeat: Infinity, repeatDelay: 1, ease: "easeInOut" };
  const sadTransition: Transition = { duration: 3.5, repeat: Infinity, ease: "easeInOut" };

  const bodyAnimation = shouldReduceMotion ? {} :
    state === "idle"
      ? { scale: [1, 1.03, 1], transition: idleTransition }
      : state === "thinking"
      ? { y: [0, -6, 0], transition: thinkingTransition }
      : state === "happy"
      ? { y: [0, -12, 0, -6, 0], scale: [1, 1.08, 1, 1.04, 1], transition: happyTransition }
      : state === "wave"
      ? { rotate: [0, -5, 5, -3, 0], transition: waveTransition }
      : state === "sad"
      ? { y: [0, 3, 0], scale: [1, 0.97, 1], transition: sadTransition }
      : {};

  return (
    <div style={{ position: "relative", display: "inline-flex", flexDirection: "column", alignItems: "center" }}>
      {/* Thinking dots above head */}
      {state === "thinking" && (
        <div style={{ display: "flex", gap: 4, marginBottom: 6, height: 12 }}>
          {thinkingDots.map((i) => (
            <motion.div
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#F97316",
              }}
              animate={shouldReduceMotion ? {} : { opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
            />
          ))}
        </div>
      )}

      {/* Happy sparkles */}
      {state === "happy" && (
        <>
          <motion.div
            style={{ position: "absolute", top: -4, right: -8, fontSize: 14 }}
            animate={shouldReduceMotion ? {} : { opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5], rotate: [0, 20, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0.1 }}
          >
            ✦
          </motion.div>
          <motion.div
            style={{ position: "absolute", top: 4, left: -10, fontSize: 10 }}
            animate={shouldReduceMotion ? {} : { opacity: [0, 1, 0], scale: [0.5, 1.1, 0.5], rotate: [0, -15, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
          >
            ✦
          </motion.div>
        </>
      )}

      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        animate={bodyAnimation}
        style={{ display: "block" }}
      >
        {/* Flame tip */}
        <motion.path
          d="M40 4 C36 10, 30 14, 32 20 C34 14, 38 12, 40 10 C42 12, 46 14, 48 20 C50 14, 44 10, 40 4Z"
          fill="#F97316"
        />
        {/* Outer flame */}
        <motion.path
          d="M40 8 C34 16, 26 20, 26 30 C26 22, 30 18, 32 22 C30 24, 28 28, 30 34 C32 28, 36 26, 38 30 C36 32, 34 36, 36 40 C38 36, 40 34, 40 36 C40 34, 42 36, 44 40 C46 36, 44 32, 42 30 C44 26, 48 28, 50 34 C52 28, 50 24, 48 22 C50 18, 54 22, 54 30 C54 20, 46 16, 40 8Z"
          fill="#FB923C"
          opacity={0.5}
        />
        {/* Body blob */}
        <ellipse cx="40" cy="52" rx="22" ry="22" fill="#F97316" />
        {/* Inner highlight */}
        <ellipse cx="40" cy="50" rx="14" ry="13" fill="#FFBA5C" opacity={0.4} />
        {/* Left eye white */}
        <circle cx="33" cy="48" r="5.5" fill="white" />
        {/* Right eye white */}
        <circle cx="47" cy="48" r="5.5" fill="white" />
        {/* Left pupil */}
        <motion.circle
          cx="34"
          cy={state === "sad" ? 50 : 48}
          r="2.5"
          fill="#1A1A2E"
          animate={state === "thinking" ? { cx: [34, 33, 35, 34] } : {}}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Right pupil */}
        <motion.circle
          cx="48"
          cy={state === "sad" ? 50 : 48}
          r="2.5"
          fill="#1A1A2E"
          animate={state === "thinking" ? { cx: [48, 47, 49, 48] } : {}}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Eye shine left */}
        <circle cx="35.5" cy="46.5" r="1" fill="white" opacity={0.9} />
        {/* Eye shine right */}
        <circle cx="49.5" cy="46.5" r="1" fill="white" opacity={0.9} />
        {/* Smile */}
        <motion.path
          d={state === "sad" ? "M34 58 Q40 53 46 58" : state === "happy" ? "M34 57 Q40 63 46 57" : "M34 56 Q40 61 46 56"}
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          animate={state === "happy" ? { d: ["M34 57 Q40 63 46 57", "M34 56 Q40 64 46 56"] } : {}}
          transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
        />
        {/* Rosy cheeks */}
        <circle cx="29" cy="54" r="4" fill="#FCA5A5" opacity={state === "sad" ? 0 : 0.35} />
        <circle cx="51" cy="54" r="4" fill="#FCA5A5" opacity={state === "sad" ? 0 : 0.35} />
        {/* Sad sweat drop */}
        {state === "sad" && (
          <ellipse cx="52" cy="16" rx="2.5" ry="3.5" fill="#93C5FD" opacity={0.9} />
        )}
      </motion.svg>
    </div>
  );
}
