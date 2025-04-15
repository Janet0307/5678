"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Volume2, VolumeX } from "lucide-react"

interface AudioControllerProps {
  onMuteChange?: (isMuted: boolean) => void
}

export function AudioController({ onMuteChange }: AudioControllerProps) {
  const [isMuted, setIsMuted] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    // Create audio element with better error handling
    const audio = new Audio()

    // Add error handling for the audio
    audio.addEventListener("error", (e) => {
      console.error("Audio error:", e)
    })

    // Set audio properties
    audio.src = "/sounds/background-music.mp3"
    audio.loop = true
    audio.volume = 0.3
    audioRef.current = audio

    // Play audio on user interaction with better error handling
    const playAudio = () => {
      if (audioRef.current && !isMuted) {
        // Check if the browser can play the audio format
        const canPlay = audio.canPlayType("audio/mp3")

        if (canPlay) {
          audioRef.current.play().catch((error) => {
            console.error("Audio playback failed:", error)
          })
        } else {
          console.warn("Browser cannot play MP3 format")
        }
      }
      // Remove event listeners after first interaction
      document.removeEventListener("click", playAudio)
      document.removeEventListener("touchstart", playAudio)
    }

    document.addEventListener("click", playAudio)
    document.addEventListener("touchstart", playAudio)

    return () => {
      // Clean up
      document.removeEventListener("click", playAudio)
      document.removeEventListener("touchstart", playAudio)
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [isMuted])

  useEffect(() => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.pause()
      } else {
        audioRef.current.play().catch((error) => {
          console.error("Audio playback failed:", error)
        })
      }
    }

    if (onMuteChange) {
      onMuteChange(isMuted)
    }
  }, [isMuted, onMuteChange])

  const toggleMute = () => {
    setIsMuted(!isMuted)
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
