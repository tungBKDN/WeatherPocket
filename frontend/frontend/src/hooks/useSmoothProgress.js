import React, { useState, useEffect } from 'react'

/**
 * Smooth progress transitions.
 * Animates progress bar smoothly between values.
 */

export function useSmoothProgress(targetProgress) {
  const [displayProgress, setDisplayProgress] = useState(0)

  useEffect(() => {
    if (targetProgress === displayProgress) return

    // Determine animation duration based on distance
    // Closer to target = faster, farther = slower
    const distance = Math.abs(targetProgress - displayProgress)
    const duration = Math.max(300, distance * 15) // 300ms minimum, 15ms per 1%

    const startTime = Date.now()
    const startProgress = displayProgress

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(1, elapsed / duration)
      const newProgress = startProgress + (targetProgress - startProgress) * progress

      setDisplayProgress(Math.round(newProgress))

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    const animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [targetProgress, displayProgress])

  return displayProgress
}
