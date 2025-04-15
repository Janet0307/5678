"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Volume2, VolumeX, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface AudioFallbackProps {
  onMuteChange?: (isMuted: boolean) => void
}

export function AudioFallback({ onMuteChange }: AudioFallbackProps) {
  const [isMuted, setIsMuted] = useState(false)
  const [audioStatus, setAudioStatus] = useState<"loading" | "available" | "unavailable">("loading")

  useEffect(() => {
    // Test if audio can be played
    const testAudio = new Audio()
    let hasResponded = false

    // Set up event listeners
    const handleCanPlay = () => {
      if (!hasResponded) {
        hasResponded = true
        setAudioStatus("available")
      }
    }

    const handleError = () => {
      if (!hasResponded) {
        hasResponded = true
        console.warn("Audio test failed - using fallback mode")
        setAudioStatus("unavailable")
      }
    }

    // Add event listeners
    testAudio.addEventListener("canplaythrough", handleCanPlay)
    testAudio.addEventListener("error", handleError)

    // Set timeout to assume failure if no response
    const timeoutId = setTimeout(() => {
      if (!hasResponded) {
        hasResponded = true
        console.warn("Audio test timed out - using fallback mode")
        setAudioStatus("unavailable")
      }
    }, 3000)

    // Set audio properties
    testAudio.preload = "auto"
    testAudio.src = "/sounds/background-music.mp3"
    testAudio.load()

    return () => {
      testAudio.removeEventListener("canplaythrough", handleCanPlay)
      testAudio.removeEventListener("error", handleError)
      clearTimeout(timeoutId)
      testAudio.src = ""
    }
  }, [])

  const toggleMute = () => {
    const newMutedState = !isMuted
    setIsMuted(newMutedState)

    if (onMuteChange) {
      onMuteChange(newMutedState)
    }
  }

  if (audioStatus === "loading") {
    return null // Don't show anything while loading
  }

  if (audioStatus === "unavailable") {
    return (
      <div className="fixed top-4 right-4 z-50 max-w-xs">
        <Alert variant="default" className="bg-white/90">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>音效無法載入</AlertTitle>
          <AlertDescription>遊戲將在無音效模式下運行。請確保您的瀏覽器支援音訊播放。</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleMute}
      className="fixed top-4 right-4 z-50 bg-white/80 hover:bg-white/90"
    >
      {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
    </Button>
  )
}
