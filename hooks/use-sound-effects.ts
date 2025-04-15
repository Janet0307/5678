"use client"

import type React from "react"

import { useRef, useCallback, useState, useEffect } from "react"

export function useSoundEffects(isMuted = false) {
  const correctSoundRef = useRef<HTMLAudioElement | null>(null)
  const wrongSoundRef = useRef<HTMLAudioElement | null>(null)
  const timeUpSoundRef = useRef<HTMLAudioElement | null>(null)

  // Track if sounds are available
  const [soundsAvailable, setSoundsAvailable] = useState({
    correct: false,
    wrong: false,
    timeUp: false,
  })

  // Initialize and preload audio elements
  useEffect(() => {
    if (typeof window === "undefined") return

    // Helper function to create and test audio
    const createAndTestAudio = (src: string, type: "correct" | "wrong" | "timeUp") => {
      const audio = new Audio()

      // Set up event listeners before setting src
      audio.addEventListener("canplaythrough", () => {
        setSoundsAvailable((prev) => ({ ...prev, [type]: true }))
      })

      audio.addEventListener("error", (e) => {
        console.warn(`${type} sound could not be loaded:`, e)
        setSoundsAvailable((prev) => ({ ...prev, [type]: false }))
      })

      // Set audio properties
      audio.volume = 0.5
      audio.preload = "auto"

      // Set source last to trigger events
      audio.src = src

      return audio
    }

    // Create audio elements
    correctSoundRef.current = createAndTestAudio("/sounds/correct-answer.mp3", "correct")
    wrongSoundRef.current = createAndTestAudio("/sounds/wrong-answer.mp3", "wrong")
    timeUpSoundRef.current = createAndTestAudio("/sounds/time-up.mp3", "timeUp")

    // Cleanup function
    return () => {
      if (correctSoundRef.current) {
        correctSoundRef.current.src = ""
        correctSoundRef.current = null
      }
      if (wrongSoundRef.current) {
        wrongSoundRef.current.src = ""
        wrongSoundRef.current = null
      }
      if (timeUpSoundRef.current) {
        timeUpSoundRef.current.src = ""
        timeUpSoundRef.current = null
      }
    }
  }, [])

  const playSound = useCallback(
    (audioRef: React.RefObject<HTMLAudioElement>, isAvailable: boolean) => {
      if (isMuted || !audioRef.current || !isAvailable) return

      try {
        // Reset audio to beginning
        audioRef.current.currentTime = 0

        // Create a promise to handle play
        const playPromise = audioRef.current.play()

        // Modern browsers return a promise from play()
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            // Auto-play was prevented or other playback error
            console.warn("Audio playback failed:", error)
          })
        }
      } catch (error) {
        console.warn("Error playing sound:", error)
      }
    },
    [isMuted],
  )

  const playCorrectSound = useCallback(() => {
    playSound(correctSoundRef, soundsAvailable.correct)
  }, [playSound, soundsAvailable.correct])

  const playWrongSound = useCallback(() => {
    playSound(wrongSoundRef, soundsAvailable.wrong)
  }, [playSound, soundsAvailable.wrong])

  const playTimeUpSound = useCallback(() => {
    playSound(timeUpSoundRef, soundsAvailable.timeUp)
  }, [playSound, soundsAvailable.timeUp])

  return {
    playCorrectSound,
    playWrongSound,
    playTimeUpSound,
    soundsAvailable,
  }
}
