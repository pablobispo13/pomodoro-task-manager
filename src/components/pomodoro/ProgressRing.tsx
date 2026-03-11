import { motion } from "framer-motion"

type Props = {
    progress: number
}

export function ProgressRing({ progress }: Props) {

    const radius = 90
    const stroke = 8
    const normalizedRadius = radius - stroke / 2

    const circumference = normalizedRadius * 2 * Math.PI
    const offset = circumference * (1 - progress)

    return (
        <svg width="220" height="220" viewBox="0 0 220 220">

            {/* background */}
            <circle
                cx="110"
                cy="110"
                r={normalizedRadius}
                className="stroke-muted"
                strokeWidth={stroke}
                fill="none"
            />

            {/* animated progress */}
            <motion.circle
                cx="110"
                cy="110"
                r={normalizedRadius}
                className="stroke-primary"
                strokeWidth={stroke}
                fill="none"
                strokeDasharray={circumference}
                strokeLinecap="round"
                transform="rotate(-90 110 110)"
                animate={{ strokeDashoffset: offset }}
                transition={{
                    duration: 0.35,
                    ease: "easeOut"
                }}
            />

        </svg>
    )
}