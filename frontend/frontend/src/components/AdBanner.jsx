import { useEffect, useRef } from 'react'

export default function AdBanner() {
  const adRef = useRef(null)
  const pushed = useRef(false)

  useEffect(() => {
    if (adRef.current && !pushed.current) {
      try {
        ;(window.adsbygoogle = window.adsbygoogle || []).push({})
        pushed.current = true
      } catch {
        // adsbygoogle not loaded yet or ad blocked
      }
    }
  }, [])

  return (
    <ins
      className="adsbygoogle"
      data-ad-client="ca-pub-2421315511368815"
      data-ad-format="horizontal"
      data-ad-slot="auto"
      data-full-width-responsive="false"
      ref={adRef}
      style={{ display: 'inline-block', width: 468, height: 60 }}
    />
  )
}
