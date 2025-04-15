"use client"

import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Trophy,
  RefreshCw,
  Clock,
  User,
  Users,
  Check,
  X,
  Calendar,
  ArrowRight,
  Sparkles,
  Copy,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Confetti from "react-confetti"
import { useWindowSize } from "@/hooks/use-window-size"
import { vocabularyByDate } from "@/data/vocabulary"

type GameMode = "single" | "multi"
type GameState = "menu" | "setup" | "waiting" | "countdown" | "playing" | "result"
type VocabItem = {
  id: number
  word: string
  definition: string
  note: string
}

type PlayerAnswer = {
  playerId: number
  playerName: string
  isCorrect: boolean
  time: number
  option?: string
}

type Player = {
  id: number
  name: string
  score: number
  isHost: boolean
  isReady?: boolean
  isOnline?: boolean
  lastActive?: number
}

// 模擬的遊戲同步狀態
type GameSyncState = {
  currentQuestionIndex: number
  timer: number
  players: Player[]
  lastAnswer: PlayerAnswer | null
  gameState: GameState
  options: string[]
}

// 修改 VocabGame 組件的 props 接口
interface VocabGameProps {
  initialRoomCode?: string | null
}

// 模擬的WebSocket連接
const createMockWebSocket = (roomCode: string, playerName: string, isHost: boolean) => {
  // 在實際應用中，這裡應該創建真正的WebSocket連接
  console.log(`創建到房間 ${roomCode} 的模擬WebSocket連接，玩家: ${playerName}, 是否房主: ${isHost}`)

  // 返回一個模擬的WebSocket對象
  return {
    send: (message: string) => {
      console.log(`發送消息: ${message}`)
      // 在實際應用中，這裡應該發送真正的WebSocket消息
    },
    close: () => {
      console.log("關閉WebSocket連接")
      // 在實際應用中，這裡應該關閉真正的WebSocket連接
    },
  }
}

// 修改 VocabGame 組件的函數簽名
export function VocabGame({ initialRoomCode = null }: VocabGameProps) {
  const { width, height } = useWindowSize()
  const [gameMode, setGameMode] = useState<GameMode>("single")
  const [gameState, setGameState] = useState<GameState>("menu")
  const [selectedDates, setSelectedDates] = useState<string[]>(["Apr. 1"])
  const [questions, setQuestions] = useState<VocabItem[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [options, setOptions] = useState<string[]>([])
  const [timer, setTimer] = useState(10)
  const [scores, setScores] = useState([0, 0])
  const [showConfetti, setShowConfetti] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const [lastAnswer, setLastAnswer] = useState<PlayerAnswer | null>(null)
  const [computerAnswerTime, setComputerAnswerTime] = useState(0)
  const [isComputerAnswering, setIsComputerAnswering] = useState(false)
  const [showIncorrectAlert, setShowIncorrectAlert] = useState(false)
  const [showTimeUpAlert, setShowTimeUpAlert] = useState(false)
  const [hasAnswered, setHasAnswered] = useState(false)
  const [opponentAnswered, setOpponentAnswered] = useState(false)
  const [opponentAnswers, setOpponentAnswers] = useState<{ [index: number]: PlayerAnswer }>({})
  const [playerAnswers, setPlayerAnswers] = useState<{ [index: number]: PlayerAnswer }>({})
  const [countdownValue, setCountdownValue] = useState(3) // 倒數計時值

  // Multiplayer specific states
  const [roomCode, setRoomCode] = useState("")
  const [playerName, setPlayerName] = useState("")
  const [joinRoomCode, setJoinRoomCode] = useState("")
  const [players, setPlayers] = useState<Player[]>([])
  const [isHost, setIsHost] = useState(false)
  const [isRoomCodeCopied, setIsRoomCodeCopied] = useState(false)
  const [shareableLink, setShareableLink] = useState("")
  const [isLinkCopied, setIsLinkCopied] = useState(false)
  const [syncInterval, setSyncInterval] = useState<NodeJS.Timeout | null>(null)
  const [lastSyncTime, setLastSyncTime] = useState(0)
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("disconnected")
  const [waitingForOpponent, setWaitingForOpponent] = useState(false)
  const [opponentDisconnected, setOpponentDisconnected] = useState(false)
  const [player2Connected, setPlayer2Connected] = useState(false) // 新增：玩家2連接狀態

  // WebSocket連接引用
  const wsRef = useRef<any>(null)

  // 玩家ID引用
  const playerIdRef = useRef<number>(1)

  // 倒數計時邏輯
  useEffect(() => {
    if (gameState === "countdown" && countdownValue > 0) {
      const interval = setInterval(() => {
        setCountdownValue((prev) => prev - 1)
      }, 1000)

      return () => clearInterval(interval)
    } else if (gameState === "countdown" && countdownValue === 0) {
      // 倒數結束，開始遊戲
      setGameState("playing")
      setCountdownValue(3) // 重置倒數值，以便下次使用
    }
  }, [gameState, countdownValue])

  // Initialize game
  useEffect(() => {
    if (gameState === "playing") {
      prepareQuestions()
    }
  }, [gameState])

  // Set up current question
  useEffect(() => {
    if (gameState === "playing" && questions.length > 0 && currentQuestionIndex < questions.length) {
      const currentQuestion = questions[currentQuestionIndex]

      // Safety check - ensure we have a valid question
      if (!currentQuestion) {
        console.warn("Invalid question at index:", currentQuestionIndex)
        setCurrentQuestionIndex(0) // Reset to first question
        return
      }

      // Generate options (1 correct + 3 random)
      const allDefinitions = getAllDefinitions()
      const correctDefinition = currentQuestion.definition

      // Safety check for definition
      if (!correctDefinition) {
        console.warn("Question missing definition:", currentQuestion)
        // Move to next question
        setTimeout(() => setCurrentQuestionIndex((prev) => (prev + 1) % questions.length), 500)
        return
      }

      const randomOptions = [correctDefinition]
      while (randomOptions.length < 4) {
        const randomDef = allDefinitions[Math.floor(Math.random() * allDefinitions.length)]
        if (!randomOptions.includes(randomDef)) {
          randomOptions.push(randomDef)
        }
      }

      // Shuffle options
      setOptions(shuffleArray(randomOptions))

      // Reset timer
      setTimer(10)

      // Reset answer states for new question
      setHasAnswered(false)
      setOpponentAnswered(false)

      // In single player mode, set up computer's answer time
      if (gameMode === "single") {
        // Computer will answer between 2-7 seconds
        setComputerAnswerTime(Math.floor(Math.random() * 5) + 2)
        setIsComputerAnswering(true)
      }

      // 在多人模式下，發送新問題通知
      if (gameMode === "multi" && wsRef.current) {
        // 在實際應用中，這裡應該通過WebSocket發送新問題的信息
        wsRef.current.send(
          JSON.stringify({
            type: "new_question",
            questionIndex: currentQuestionIndex,
            options: randomOptions,
          }),
        )
      }
    }
  }, [currentQuestionIndex, questions, gameState])

  // Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (gameState === "playing" && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => {
          // Computer's turn to answer in single player mode
          if (gameMode === "single" && isComputerAnswering && prev === computerAnswerTime) {
            handleComputerAnswer()
          }
          return prev - 1
        })
      }, 1000)
    } else if (timer === 0 && gameState === "playing") {
      // Time's up, move to next question
      handleTimeUp()
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [timer, gameState, computerAnswerTime, isComputerAnswering])

  // Check if game is over
  useEffect(() => {
    if (gameState === "playing" && currentQuestionIndex >= 10) {
      // 修改為10題
      setGameState("result")

      // Show confetti or warning based on game result
      if (gameMode === "single") {
        if (scores[0] > scores[1]) {
          setShowConfetti(true)
        } else {
          setShowWarning(true)
        }
      } else if (gameMode === "multi") {
        // 在多人模式下，根據玩家ID確定是否獲勝
        const playerIndex = playerIdRef.current - 1
        const opponentIndex = playerIndex === 0 ? 1 : 0

        if (scores[playerIndex] > scores[opponentIndex]) {
          setShowConfetti(true)
        } else if (scores[playerIndex] < scores[opponentIndex]) {
          setShowWarning(true)
        }
        // 平局不顯示特效
      }

      // 在多人模式下，發送遊戲結束通知
      if (gameMode === "multi" && wsRef.current) {
        wsRef.current.send(
          JSON.stringify({
            type: "game_over",
            scores: scores,
          }),
        )
      }
    }
  }, [currentQuestionIndex, gameState, gameMode, scores])

  // Hide confetti after 5 seconds
  useEffect(() => {
    if (showConfetti) {
      const timer = setTimeout(() => {
        setShowConfetti(false)
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [showConfetti])

  // Hide warning after 3 seconds
  useEffect(() => {
    if (showWarning) {
      const timer = setTimeout(() => {
        setShowWarning(false)
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [showWarning])

  // 設置WebSocket連接
  useEffect(() => {
    if (gameMode === "multi" && gameState === "waiting" && roomCode && playerName) {
      // 創建WebSocket連接
      if (!wsRef.current) {
        wsRef.current = createMockWebSocket(roomCode, playerName, isHost)
      }

      // 確保連接狀態為"已連接"
      setConnectionStatus("connected")

      // 設置同步間隔
      const interval = setInterval(() => {
        if (wsRef.current) {
          // 模擬接收遊戲狀態更新
          simulateReceiveGameUpdate()
          setLastSyncTime(Date.now())
        }
      }, 1000)

      setSyncInterval(interval)

      // 清理函數
      return () => {
        if (wsRef.current) {
          wsRef.current.close()
          wsRef.current = null
        }

        if (interval) {
          clearInterval(interval)
        }
      }
    }
  }, [gameMode, gameState, roomCode, playerName, isHost])

  // 模擬接收遊戲狀態更新
  const simulateReceiveGameUpdate = () => {
    // 在實際應用中，這裡應該處理從WebSocket接收到的消息
    // 這裡我們模擬接收到的消息

    // 確保玩家列表至少包含兩個玩家
    if (gameState === "waiting" && players.length < 2) {
      const opponentName = isHost ? "玩家2" : "房主"
      const opponentId = isHost ? 2 : 1

      // 如果是房主，模擬玩家2加入
      if (isHost && Math.random() > 0.7 && !player2Connected) {
        setPlayers((prev) => {
          // 檢查玩家是否已經存在
          if (prev.some((p) => p.id === opponentId)) {
            return prev
          }

          // 設置玩家2已連接
          setPlayer2Connected(true)

          return [
            ...prev,
            {
              id: opponentId,
              name: opponentName,
              score: 0,
              isHost: !isHost,
              isOnline: true,
              lastActive: Date.now(),
            },
          ]
        })
      }

      // 如果是玩家2，確保能看到玩家1
      if (!isHost) {
        setPlayers((prev) => {
          if (prev.some((p) => p.id === 1)) {
            return prev
          }
          return [
            { id: 1, name: "房主", score: 0, isHost: true, isOnline: true, lastActive: Date.now() },
            ...prev.filter((p) => p.id !== 1),
          ]
        })
      }
    }

    // 模擬遊戲狀態同步 - 如果房主開始了遊戲，玩家2也應該開始
    if (!isHost && gameState === "waiting" && Math.random() > 0.7) {
      // 模擬接收到房主開始遊戲的消息
      setGameState("countdown")
    }

    // 模擬對手回答問題 - 修改為獨立回答
    if (gameState === "playing" && !opponentAnswers[currentQuestionIndex] && Math.random() > 0.7) {
      const isCorrect = Math.random() > 0.5
      const opponentId = isHost ? 2 : 1
      const opponentName = isHost ? "玩家2" : "房主"

      // 對手可以獨立回答，不需要檢查玩家是否已回答
      handleOpponentAnswer(isCorrect, opponentId, opponentName)
    }
  }

  // 處理對手回答 - 修改為獨立回答
  const handleOpponentAnswer = (isCorrect: boolean, opponentId: number, opponentName: string) => {
    setOpponentAnswered(true)

    // 安全檢查 - 確保我們有有效的問題和當前問題
    if (!questions.length || currentQuestionIndex >= questions.length) {
      console.warn("Invalid question state in handle opponent answer")
      return
    }

    const currentQuestion = questions[currentQuestionIndex]
    if (!currentQuestion || !currentQuestion.definition) {
      console.warn("Current question is invalid in handle opponent answer")
      return
    }

    // 計算得分
    let pointsEarned = 0
    if (isCorrect) {
      // 根據剩餘時間計算得分
      if (timer >= 7) {
        pointsEarned = 20
      } else if (timer >= 4) {
        pointsEarned = 10
      } else {
        pointsEarned = 5
      }
    }

    // 更新得分
    setScores((prev) => {
      const newScores = [...prev]
      const opponentIndex = opponentId - 1
      newScores[opponentIndex] += pointsEarned
      return newScores
    })

    // 記錄回答
    const answer: PlayerAnswer = {
      playerId: opponentId,
      playerName: opponentName,
      isCorrect,
      time: 10 - timer,
      option: isCorrect ? currentQuestion.definition : "錯誤選項",
    }

    // 儲存對手的回答
    setOpponentAnswers((prev) => ({
      ...prev,
      [currentQuestionIndex]: answer,
    }))

    setLastAnswer(answer)

    // 顯示對手的回答結果
    setTimeout(() => {
      setLastAnswer(null)
    }, 2000)

    // 檢查是否雙方都已回答
    checkBothPlayersAnswered(currentQuestionIndex, answer)
  }

  // 檢查雙方是否都已回答
  const checkBothPlayersAnswered = (questionIndex: number, newAnswer: PlayerAnswer) => {
    const playerAnswer = playerAnswers[questionIndex]
    const opponentAnswer = opponentAnswers[questionIndex] || newAnswer

    // 如果雙方都已回答，準備移動到下一題
    if (playerAnswer && opponentAnswer) {
      setTimeout(() => {
        setCurrentQuestionIndex((prev) => prev + 1)
        setLastAnswer(null)
        setHasAnswered(false)
        setOpponentAnswered(false)
      }, 2000)
    }
  }

  // Generate a random room code
  const generateRoomCode = () => {
    const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // Removed similar looking characters
    let result = ""
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    return result
  }

  const prepareQuestions = () => {
    // Collect all vocabulary items from selected dates
    let allVocab: VocabItem[] = []

    // Safety check for selected dates
    if (selectedDates.length === 0) {
      console.warn("No dates selected, defaulting to Apr. 1")
      selectedDates.push("Apr. 1")
    }

    selectedDates.forEach((date) => {
      // Safety check for vocabulary data
      if (vocabularyByDate[date]) {
        allVocab = [...allVocab, ...vocabularyByDate[date]]
      } else {
        console.warn(`No vocabulary found for date: ${date}`)
      }
    })

    // Safety check for empty vocabulary
    if (allVocab.length === 0) {
      console.warn("No vocabulary items found, using fallback")
      // Use first available date as fallback
      const fallbackDate = Object.keys(vocabularyByDate)[0]
      allVocab = [...vocabularyByDate[fallbackDate]]
    }

    // Shuffle and take first 10 (or less if not enough) - 修改為10題
    const shuffled = shuffleArray(allVocab)
    const selected = shuffled.slice(0, Math.min(10, shuffled.length))

    // Safety check for empty selection
    if (selected.length === 0) {
      console.error("Failed to prepare questions - no vocabulary available")
      return
    }

    setQuestions(selected)
    setCurrentQuestionIndex(0)
    setScores([0, 0])
    setLastAnswer(null)
    setPlayerAnswers({})
    setOpponentAnswers({})

    // 在多人模式下，發送問題準備完成的通知
    if (gameMode === "multi" && wsRef.current) {
      wsRef.current.send(
        JSON.stringify({
          type: "questions_ready",
          questionCount: selected.length,
        }),
      )
    }
  }

  const getAllDefinitions = () => {
    // Get all definitions for random options
    const allDefinitions: string[] = []
    Object.values(vocabularyByDate).forEach((dateVocab) => {
      dateVocab.forEach((item) => {
        allDefinitions.push(item.definition)
      })
    })
    return allDefinitions
  }

  const handleComputerAnswer = () => {
    setIsComputerAnswering(false)

    // Safety check - ensure we have valid questions and current question
    if (!questions.length || currentQuestionIndex >= questions.length) {
      console.warn("Invalid question state in computer answer")
      return
    }

    const currentQuestion = questions[currentQuestionIndex]
    if (!currentQuestion || !currentQuestion.definition) {
      console.warn("Current question is invalid in computer answer")
      // Move to next question
      setTimeout(() => setCurrentQuestionIndex((prev) => (prev + 1) % questions.length), 500)
      return
    }

    // 80% chance computer gets it right
    const isCorrect = Math.random() < 0.8

    if (isCorrect) {
      // Find the correct option
      const correctOptionIndex = options.findIndex((opt) => opt === currentQuestion.definition)

      // Safety check for valid option index
      if (correctOptionIndex === -1) {
        console.warn("Correct option not found in options")
        // Move to next question
        setTimeout(() => setCurrentQuestionIndex((prev) => (prev + 1) % questions.length), 500)
        return
      }

      // Computer selects the correct answer
      handleAnswer(correctOptionIndex, 2, "電腦")
    } else {
      // Computer selects a wrong answer
      const correctOptionIndex = options.findIndex((opt) => opt === currentQuestion.definition)

      // Safety check for valid option index
      if (correctOptionIndex === -1 || options.length < 2) {
        console.warn("Cannot select wrong answer - options invalid")
        // Move to next question
        setTimeout(() => setCurrentQuestionIndex((prev) => (prev + 1) % questions.length), 500)
        return
      }

      // Find a wrong option
      let wrongOptionIndex
      do {
        wrongOptionIndex = Math.floor(Math.random() * options.length)
      } while (wrongOptionIndex === correctOptionIndex)

      // Computer selects the wrong answer
      handleAnswer(wrongOptionIndex, 2, "電腦")
    }
  }

  const handleTimeUp = () => {
    // Show time up alert
    setShowTimeUpAlert(true)

    // Hide alert after 1 second
    setTimeout(() => {
      setShowTimeUpAlert(false)
    }, 1000)

    // 在多人模式下，如果玩家尚未回答，記錄為超時
    if (gameMode === "multi" && !hasAnswered) {
      const playerAnswer: PlayerAnswer = {
        playerId: playerIdRef.current,
        playerName: playerName,
        isCorrect: false,
        time: 10,
        option: "超時未答",
      }

      setPlayerAnswers((prev) => ({
        ...prev,
        [currentQuestionIndex]: playerAnswer,
      }))

      // 檢查是否雙方都已回答
      checkBothPlayersAnswered(currentQuestionIndex, playerAnswer)
    } else {
      // 單人模式或對手尚未回答，直接移動到下一題
      setTimeout(() => {
        setCurrentQuestionIndex((prev) => prev + 1)
        setHasAnswered(false)
        setOpponentAnswered(false)
      }, 1500)
    }

    // 在多人模式下，發送超時通知
    if (gameMode === "multi" && wsRef.current) {
      wsRef.current.send(
        JSON.stringify({
          type: "time_up",
          questionIndex: currentQuestionIndex,
          playerId: playerIdRef.current,
        }),
      )
    }
  }

  const handleAnswer = (optionIndex: number, playerId: number, playerNameParam?: string) => {
    // 在多人模式下，如果已經回答過，則不能再回答
    if (gameMode === "multi" && hasAnswered) {
      return
    }

    // 設置已回答狀態
    if (gameMode === "multi" && playerId === playerIdRef.current) {
      setHasAnswered(true)
    }

    // Safety check - ensure we have valid questions and current question
    if (!questions.length || currentQuestionIndex >= questions.length) {
      console.warn("Invalid question state in handle answer")
      return
    }

    const currentQuestion = questions[currentQuestionIndex]
    if (!currentQuestion || !currentQuestion.definition) {
      console.warn("Current question is invalid in handle answer")
      // Move to next question
      setTimeout(() => setCurrentQuestionIndex((prev) => (prev + 1) % Math.max(1, questions.length)), 500)
      return
    }

    // Safety check for options
    if (optionIndex < 0 || optionIndex >= options.length) {
      console.warn("Invalid option index:", optionIndex)
      return
    }

    const selectedOption = options[optionIndex]
    const isCorrect = selectedOption === currentQuestion.definition

    // Calculate score based on time
    let pointsEarned = 0
    if (isCorrect) {
      if (timer >= 7) {
        pointsEarned = 20
      } else if (timer >= 4) {
        pointsEarned = 10
      } else {
        pointsEarned = 5
      }

      // Show confetti for correct answer
      setShowConfetti(true)

      // Hide confetti after 1 second
      setTimeout(() => {
        setShowConfetti(false)
      }, 1000)
    } else {
      // Show incorrect alert
      setShowIncorrectAlert(true)

      // Hide alert after 1 second
      setTimeout(() => {
        setShowIncorrectAlert(false)
      }, 1000)
    }

    // Update score
    setScores((prev) => {
      const newScores = [...prev]
      newScores[playerId - 1] += pointsEarned
      return newScores
    })

    // Record answer
    const actualPlayerName = playerNameParam || (playerId === 1 ? playerName : "對手")
    const answer: PlayerAnswer = {
      playerId,
      playerName: actualPlayerName,
      isCorrect,
      time: 10 - timer,
      option: selectedOption,
    }

    // 儲存玩家的回答
    if (gameMode === "multi" && playerId === playerIdRef.current) {
      setPlayerAnswers((prev) => ({
        ...prev,
        [currentQuestionIndex]: answer,
      }))
    }

    setLastAnswer(answer)

    // In single player mode, if player answered, computer shouldn't answer
    if (gameMode === "single" && playerId === 1) {
      setIsComputerAnswering(false)
    }

    // 在多人模式下，發送回答通知
    if (gameMode === "multi" && playerId === playerIdRef.current && wsRef.current) {
      wsRef.current.send(
        JSON.stringify({
          type: "answer",
          questionIndex: currentQuestionIndex,
          optionIndex: optionIndex,
          isCorrect: isCorrect,
          time: 10 - timer,
          score: scores[playerId - 1] + pointsEarned,
        }),
      )
    }

    // 處理回答後的邏輯
    if (gameMode === "single") {
      // 單人模式，回答後移動到下一題
      setTimeout(() => {
        setCurrentQuestionIndex((prev) => prev + 1)
        setLastAnswer(null)
        setHasAnswered(false)
        setOpponentAnswered(false)
      }, 2000)
    } else {
      // 多人模式，檢查雙方是否都已回答
      setTimeout(() => {
        setLastAnswer(null)
        checkBothPlayersAnswered(currentQuestionIndex, answer)
      }, 2000)
    }
  }

  const startGame = () => {
    if (selectedDates.length === 0) {
      // Ensure at least one date is selected
      setSelectedDates(["Apr. 1"])
    }

    // 單人模式直接開始遊戲
    if (gameMode === "single") {
      setGameState("countdown") // 先進入倒數狀態
    }
  }

  const restartGame = () => {
    setGameState("menu")
    setShowConfetti(false)
    setShowWarning(false)

    // 在多人模式下，關閉WebSocket連接
    if (gameMode === "multi" && wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    // 清除同步間隔
    if (syncInterval) {
      clearInterval(syncInterval)
      setSyncInterval(null)
    }

    // 重置玩家2連接狀態
    setPlayer2Connected(false)
  }

  const toggleDateSelection = (date: string) => {
    setSelectedDates((prev) => {
      if (prev.includes(date)) {
        // Remove if already selected
        return prev.filter((d) => d !== date)
      } else {
        // Add if not selected
        return [...prev, date]
      }
    })
  }

  const createRoom = () => {
    if (!playerName.trim()) {
      alert("請輸入您的名字")
      return
    }

    const newRoomCode = generateRoomCode()
    setRoomCode(newRoomCode)
    setIsHost(true)
    playerIdRef.current = 1 // 房主是玩家1

    // 創建可分享的連結
    const baseUrl = window.location.origin + window.location.pathname
    const shareUrl = `${baseUrl}?room=${newRoomCode}`
    setShareableLink(shareUrl)

    // 初始化玩家列表
    setPlayers([{ id: 1, name: playerName, score: 0, isHost: true, isOnline: true, lastActive: Date.now() }])

    setGameState("waiting")
    setConnectionStatus("connecting")

    // 模擬連接建立
    setTimeout(() => {
      setConnectionStatus("connected")
    }, 1000)
  }

  const joinRoom = () => {
    if (!playerName.trim()) {
      alert("請輸入您的名字")
      return
    }

    if (!joinRoomCode.trim()) {
      alert("請輸入房間代碼")
      return
    }

    // 在實際應用中，這裡應該向服務器確認房間是否存在
    setRoomCode(joinRoomCode)
    setIsHost(false)
    playerIdRef.current = 2 // 加入者是玩家2

    // 模擬加入現有房間
    setPlayers([
      { id: 1, name: "房主", score: 0, isHost: true, isOnline: true, lastActive: Date.now() },
      { id: 2, name: playerName, score: 0, isHost: false, isOnline: true, lastActive: Date.now() },
    ])

    // 更新URL以包含房間代碼，但不重新加載頁面
    const newUrl = `${window.location.pathname}?room=${joinRoomCode}`
    window.history.pushState({ path: newUrl }, "", newUrl)

    setGameState("waiting")

    // 立即設置連接狀態為"連接中"
    setConnectionStatus("connecting")

    // 確保WebSocket連接正確建立
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    // 延遲創建WebSocket連接，確保狀態已更新
    setTimeout(() => {
      wsRef.current = createMockWebSocket(joinRoomCode, playerName, false)
      setConnectionStatus("connected")

      // 設置同步間隔
      const interval = setInterval(() => {
        if (wsRef.current) {
          // 模擬接收遊戲狀態更新
          simulateReceiveGameUpdate()
          setLastSyncTime(Date.now())
        }
      }, 1000)

      setSyncInterval(interval)
    }, 500)
  }

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode)
    setIsRoomCodeCopied(true)
    setTimeout(() => setIsRoomCodeCopied(false), 2000)
  }

  const copyShareableLink = () => {
    navigator.clipboard.writeText(shareableLink)
    setIsLinkCopied(true)
    setTimeout(() => setIsLinkCopied(false), 2000)
  }

  const startMultiplayerGame = () => {
    if (isHost) {
      // 模擬通知其他玩家遊戲開始
      console.log("房主開始了遊戲，通知所有玩家")

      // 在實際應用中，這裡應該發送WebSocket消息
      if (wsRef.current) {
        wsRef.current.send(
          JSON.stringify({
            type: "game_start",
            selectedDates: selectedDates,
          }),
        )
      }

      // 進入倒數計時狀態
      setGameState("countdown")
    }
  }

  const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array]
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[newArray[i], newArray[j]] = [newArray[j], newArray[i]]
    }
    return newArray
  }

  // 添加一個 useEffect 來處理初始房間代碼
  useEffect(() => {
    if (initialRoomCode) {
      setJoinRoomCode(initialRoomCode)
      setGameMode("multi")
      // 不直接設置 gameState，讓用戶先輸入名字
    }
  }, [initialRoomCode])

  // 檢查URL是否包含房間代碼
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search)
      const roomFromUrl = urlParams.get("room")

      if (roomFromUrl) {
        setJoinRoomCode(roomFromUrl)
        setGameMode("multi")
        setGameState("setup")
      }
    }
  }, [])

  // 渲染連接狀態指示器
  const renderConnectionStatus = () => {
    if (connectionStatus === "connecting") {
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
          <div className="animate-pulse mr-1 h-2 w-2 rounded-full bg-yellow-500"></div>
          連接中...
        </Badge>
      )
    } else if (connectionStatus === "connected") {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
          <div className="mr-1 h-2 w-2 rounded-full bg-green-500"></div>
          已連接
        </Badge>
      )
    } else {
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
          <div className="mr-1 h-2 w-2 rounded-full bg-red-500"></div>
          未連接
        </Badge>
      )
    }
  }

  // 渲染倒數計時
  const renderCountdown = () => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-16 shadow-lg text-center">
          <h2 className="text-3xl font-bold mb-4 text-[#1a75c1]">準備開始</h2>
          <div className="text-6xl font-bold text-[#f8c537]">{countdownValue}</div>
        </div>
      </div>
    )
  }

  // Render game menu
  if (gameState === "menu") {
    return (
      <div className="w-full">
        <h2 className="text-2xl font-bold text-center mb-6 text-[#1a75c1]">選擇遊戲模式</h2>

        <Tabs defaultValue="single" onValueChange={(value) => setGameMode(value as GameMode)} className="mb-6">
          <TabsList className="grid grid-cols-2 mb-4 bg-[#f0f0f0]">
            <TabsTrigger value="single" className="flex items-center gap-2 data-[state=active]:bg-[#1a75c1]">
              <User className="h-4 w-4" /> 單人模式
            </TabsTrigger>
            <TabsTrigger value="multi" className="flex items-center gap-2 data-[state=active]:bg-[#1a75c1]">
              <Users className="h-4 w-4" /> 雙人對戰
            </TabsTrigger>
          </TabsList>

          <TabsContent value="single">
            <div className="bg-[#f8f8f8] p-4 rounded-lg border border-[#e0e0e0] mb-4">
              <p className="text-gray-600">與電腦對戰，看誰答題更快更準確！</p>
            </div>

            <div className="mb-6 bg-[#f8f8f8] p-4 rounded-lg border border-[#e0e0e0]">
              <h3 className="text-lg font-medium mb-3 flex items-center gap-2 text-[#1a75c1]">
                <Calendar className="h-4 w-4" /> 選擇單字範圍
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.keys(vocabularyByDate).map((date) => (
                  <div key={date} className="flex items-center space-x-2">
                    <Checkbox
                      id={`single-${date}`}
                      checked={selectedDates.includes(date)}
                      onCheckedChange={() => toggleDateSelection(date)}
                      className="border-[#1a75c1] data-[state=checked]:bg-[#1a75c1]"
                    />
                    <label
                      htmlFor={`single-${date}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {date}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={startGame}
              className="w-full py-6 text-lg bg-gradient-to-r from-[#e86d7f] to-[#d84c5f] hover:from-[#e85c70] hover:to-[#d03a4d] transition-all"
            >
              開始遊戲 <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </TabsContent>

          <TabsContent value="multi">
            <div className="bg-[#f8f8f8] p-4 rounded-lg border border-[#e0e0e0] mb-4">
              <p className="text-gray-600">與朋友一起答題，各自在自己的裝置上回答相同的題目！</p>
            </div>

            <div className="mb-6 bg-[#f8f8f8] p-4 rounded-lg border border-[#e0e0e0]">
              <h3 className="text-lg font-medium mb-3 text-[#1a75c1]">輸入您的名字</h3>
              <Input
                placeholder="請輸入您的名字"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="mb-4"
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-2 text-[#1a75c1]">創建新房間</h4>
                  <Button onClick={createRoom} className="w-full bg-[#1a75c1] hover:bg-[#0d5ca0]">
                    創建房間
                  </Button>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2 text-[#1a75c1]">加入現有房間</h4>
                  <div className="flex gap-2">
                    <Input
                      placeholder="輸入房間代碼"
                      value={joinRoomCode}
                      onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
                      className="flex-1"
                      maxLength={6}
                    />
                    <Button onClick={joinRoom} className="bg-[#1a75c1] hover:bg-[#0d5ca0]">
                      加入
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  // Render waiting room
  if (gameState === "waiting") {
    return (
      <div className="w-full">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-[#1a75c1] mb-2">等待玩家加入</h2>
          <div className="w-20 h-1 bg-[#f8c537] mx-auto"></div>
        </div>

        <Card className="p-6 mb-6 border-2 border-[#1a75c1]">
          <div className="flex justify-end mb-2">{renderConnectionStatus()}</div>

          <div className="text-center mb-4">
            <h3 className="text-lg font-medium text-[#1a75c1] mb-2">房間代碼</h3>
            <div className="flex items-center justify-center gap-2">
              <div className="text-3xl font-bold tracking-widest bg-gray-100 px-4 py-2 rounded-md">{roomCode}</div>
              <Button variant="outline" size="icon" onClick={copyRoomCode} className="h-10 w-10">
                {isRoomCodeCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-sm text-gray-500 mt-2">分享此代碼給您的朋友以加入遊戲</p>
          </div>

          {isHost && (
            <div className="mt-4">
              <h3 className="text-lg font-medium text-[#1a75c1] mb-2">分享連結</h3>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-100 p-2 rounded text-sm overflow-hidden text-ellipsis">
                  {shareableLink}
                </div>
                <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={copyShareableLink}>
                  {isLinkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {isLinkCopied ? "已複製" : "複製"}
                </Button>
              </div>
              <p className="text-sm text-gray-500 mt-2">將此連結分享給朋友，他們可以直接點擊加入您的房間</p>
            </div>
          )}

          <div className="my-6">
            <h3 className="text-lg font-medium text-[#1a75c1] mb-2">玩家列表</h3>
            <div className="space-y-2">
              {players.map((player) => (
                <div key={player.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-[#1a75c1]" />
                    <span className="font-medium">{player.name}</span>
                    {player.isOnline && <div className="h-2 w-2 rounded-full bg-green-500"></div>}
                  </div>
                  {player.isHost && <Badge className="bg-[#1a75c1]">房主</Badge>}
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6 bg-[#f8f8f8] p-4 rounded-lg border border-[#e0e0e0]">
            <h3 className="text-lg font-medium mb-3 flex items-center gap-2 text-[#1a75c1]">
              <Calendar className="h-4 w-4" /> 選擇單字範圍
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {Object.keys(vocabularyByDate).map((date) => (
                <div key={date} className="flex items-center space-x-2">
                  <Checkbox
                    id={`multi-${date}`}
                    checked={selectedDates.includes(date)}
                    onCheckedChange={() => toggleDateSelection(date)}
                    className="border-[#1a75c1] data-[state=checked]:bg-[#1a75c1]"
                    disabled={!isHost}
                  />
                  <label
                    htmlFor={`multi-${date}`}
                    className={`text-sm font-medium leading-none ${!isHost ? "opacity-70" : ""}`}
                  >
                    {date}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {isHost ? (
            <Button
              onClick={startMultiplayerGame}
              className="w-full py-6 text-lg bg-gradient-to-r from-[#e86d7f] to-[#d84c5f] hover:from-[#e85c70] hover:to-[#d03a4d] transition-all"
              disabled={!player2Connected}
            >
              {!player2Connected ? "等待其他玩家加入..." : "開始遊戲"} <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          ) : (
            <div className="text-center p-4 bg-gray-50 rounded-md">
              <p className="text-gray-600">等待房主開始遊戲...</p>
            </div>
          )}
        </Card>

        <Button variant="outline" onClick={restartGame} className="w-full">
          返回主選單
        </Button>
      </div>
    )
  }

  // 渲染倒數計時狀態
  if (gameState === "countdown") {
    return renderCountdown()
  }

  // Render game result
  if (gameState === "result") {
    // 在多人模式下，根據玩家ID確定是否獲勝
    const player1Won = scores[0] > scores[1]
    const player2Won = scores[1] > scores[0]
    const isTie = scores[0] === scores[1]

    // 獲取當前玩家的索引
    const playerIndex = playerIdRef.current - 1
    const opponentIndex = playerIndex === 0 ? 1 : 0

    // 判斷當前玩家是否獲勝
    const currentPlayerWon = scores[playerIndex] > scores[opponentIndex]
    const opponentWon = scores[playerIndex] < scores[opponentIndex]

    return (
      <div className="w-full">
        {showConfetti && <Confetti width={width} height={height} recycle={false} numberOfPieces={200} />}

        {showWarning && (
          <div className="fixed inset-0 bg-red-500 bg-opacity-30 z-50 flex items-center justify-center animate-pulse pointer-events-none">
            <div className="bg-white bg-opacity-80 rounded-lg p-8 shadow-lg">
              <X className="h-20 w-20 text-red-600 mx-auto mb-4" />
              <div className="text-2xl font-bold text-center text-red-600">你輸了！</div>
            </div>
          </div>
        )}

        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-[#1a75c1] mb-2">遊戲結果</h2>
          <div className="w-20 h-1 bg-[#f8c537] mx-auto"></div>
        </div>

        <div className="flex justify-center mb-6">
          <Trophy className="h-16 w-16 text-[#f8c537]" />
        </div>

        {gameMode === "multi" ? (
          // 多人模式結果顯示
          <>
            {currentPlayerWon && (
              <div className="bg-[#e8f4fc] p-4 rounded-lg text-center mb-6 border-2 border-[#1a75c1]">
                <Sparkles className="h-8 w-8 text-[#f8c537] mx-auto mb-2" />
                <h3 className="text-xl font-bold text-[#1a75c1] mb-1">恭喜你贏了！</h3>
                <p className="text-[#1a75c1]">你的表現太棒了！</p>
              </div>
            )}

            {opponentWon && (
              <div className="bg-[#fde8eb] p-4 rounded-lg text-center mb-6 border-2 border-[#e86d7f]">
                <X className="h-8 w-8 text-[#e86d7f] mx-auto mb-2" />
                <h3 className="text-xl font-bold text-[#e86d7f] mb-1">你輸了！</h3>
                <p className="text-[#e86d7f]">再接再厲，下次一定能贏！</p>
              </div>
            )}

            {isTie && (
              <div className="bg-[#f8f8f8] p-4 rounded-lg text-center mb-6 border-2 border-[#f8c537]">
                <AlertCircle className="h-8 w-8 text-[#f8c537] mx-auto mb-2" />
                <h3 className="text-xl font-bold text-[#f8c537] mb-1">平局！</h3>
                <p className="text-[#f8c537]">你們勢均力敵！</p>
              </div>
            )}
          </>
        ) : (
          // 單人模式結果顯示
          <>
            {player1Won && (
              <div className="bg-[#e8f4fc] p-4 rounded-lg text-center mb-6 border-2 border-[#1a75c1]">
                <Sparkles className="h-8 w-8 text-[#f8c537] mx-auto mb-2" />
                <h3 className="text-xl font-bold text-[#1a75c1] mb-1">恭喜你贏了！</h3>
                <p className="text-[#1a75c1]">你的表現太棒了！</p>
              </div>
            )}

            {player2Won && (
              <div className="bg-[#fde8eb] p-4 rounded-lg text-center mb-6 border-2 border-[#e86d7f]">
                <X className="h-8 w-8 text-[#e86d7f] mx-auto mb-2" />
                <h3 className="text-xl font-bold text-[#e86d7f] mb-1">你輸了！</h3>
                <p className="text-[#e86d7f]">再接再厲，下次一定能贏！</p>
              </div>
            )}
          </>
        )}

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div
            className={cn(
              "p-4 rounded-lg text-center",
              (gameMode === "multi" && playerIdRef.current === 1 && currentPlayerWon) ||
                (gameMode === "multi" && playerIdRef.current === 2 && opponentWon) ||
                (gameMode === "single" && player1Won)
                ? "bg-[#e8f4fc] border-2 border-[#1a75c1]"
                : "bg-[#f8f8f8]",
            )}
          >
            <h3 className="font-bold mb-2 text-[#1a75c1]">
              {gameMode === "multi"
                ? playerIdRef.current === 1
                  ? playerName
                  : players.find((p) => p.id === 1)?.name || "玩家 1"
                : "玩家"}
            </h3>
            <p className="text-3xl font-bold text-[#1a75c1]">{scores[0]}</p>
            {((gameMode === "multi" && playerIdRef.current === 1 && currentPlayerWon) ||
              (gameMode === "multi" && playerIdRef.current === 2 && opponentWon) ||
              (gameMode === "single" && player1Won)) && <Badge className="mt-2 bg-[#1a75c1]">勝利</Badge>}
          </div>

          <div
            className={cn(
              "p-4 rounded-lg text-center",
              (gameMode === "multi" && playerIdRef.current === 2 && currentPlayerWon) ||
                (gameMode === "multi" && playerIdRef.current === 1 && opponentWon) ||
                (gameMode === "single" && player2Won)
                ? "bg-[#e8f4fc] border-2 border-[#1a75c1]"
                : "bg-[#f8f8f8]",
            )}
          >
            <h3 className="font-bold mb-2 text-[#e86d7f]">
              {gameMode === "multi"
                ? playerIdRef.current === 2
                  ? playerName
                  : players.find((p) => p.id === 2)?.name || "玩家 2"
                : "電腦"}
            </h3>
            <p className="text-3xl font-bold text-[#e86d7f]">{scores[1]}</p>
            {((gameMode === "multi" && playerIdRef.current === 2 && currentPlayerWon) ||
              (gameMode === "multi" && playerIdRef.current === 1 && opponentWon) ||
              (gameMode === "single" && player2Won)) && <Badge className="mt-2 bg-[#e86d7f]">勝利</Badge>}
          </div>
        </div>

        {isTie && (
          <div className="text-center mb-6">
            <Badge className="bg-[#f8c537]">平手</Badge>
          </div>
        )}

        <Button
          onClick={restartGame}
          className="w-full py-6 text-lg bg-gradient-to-r from-[#1a75c1] to-[#0d5ca0] hover:from-[#1568ab] hover:to-[#0a4e8a] transition-all"
        >
          <RefreshCw className="mr-2 h-5 w-5" /> 再玩一次
        </Button>
      </div>
    )
  }

  // Render game playing state
  return (
    <div className="w-full">
      {showConfetti && <Confetti width={width} height={height} recycle={false} numberOfPieces={50} />}

      {showIncorrectAlert && (
        <div className="fixed inset-0 bg-red-500 bg-opacity-30 z-50 flex items-center justify-center animate-pulse pointer-events-none">
          <div className="bg-white bg-opacity-80 rounded-lg p-4 shadow-lg">
            <X className="h-12 w-12 text-red-600 mx-auto" />
          </div>
        </div>
      )}

      {showTimeUpAlert && (
        <div className="fixed inset-0 bg-orange-500 bg-opacity-30 z-50 flex items-center justify-center animate-pulse pointer-events-none">
          <div className="bg-white bg-opacity-80 rounded-lg p-4 shadow-lg">
            <Clock className="h-12 w-12 text-orange-600 mx-auto" />
          </div>
        </div>
      )}

      <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
        <div className="flex gap-2">
          <Badge
            variant="outline"
            className="text-sm px-3 py-1 flex items-center gap-1 border-[#1a75c1] text-[#1a75c1]"
          >
            <Clock className="h-3 w-3" /> {timer}s
          </Badge>
          <Badge variant="outline" className="text-sm px-3 py-1 border-[#1a75c1] text-[#1a75c1]">
            {currentQuestionIndex + 1}/10
          </Badge>

          {gameMode === "multi" && renderConnectionStatus()}
        </div>

        <div className="flex gap-2">
          <Badge className="bg-[#1a75c1] text-sm px-3 py-1">
            {gameMode === "multi"
              ? playerIdRef.current === 1
                ? playerName
                : players.find((p) => p.id === 1)?.name || "玩家 1"
              : "玩家"}
            : {scores[0]}
          </Badge>
          <Badge className="bg-[#e86d7f] text-sm px-3 py-1">
            {gameMode === "multi"
              ? playerIdRef.current === 2
                ? playerName
                : players.find((p) => p.id === 2)?.name || "玩家 2"
              : "電腦"}
            : {scores[1]}
          </Badge>
        </div>
      </div>

      {questions.length > 0 && currentQuestionIndex < questions.length && questions[currentQuestionIndex] && (
        <div className="mb-6">
          <Card className="p-6 mb-4 shadow-md bg-white border-t-4 border-t-[#f8c537]">
            <div className="flex justify-end mb-1">
              <span className="text-xs text-[#1a75c1] font-medium">{questions[currentQuestionIndex].note || ""}</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-center mb-2 text-[#1a75c1]">
              {questions[currentQuestionIndex].word || ""}
            </h2>
            <div className="w-16 h-1 bg-[#f8c537] mx-auto"></div>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            {options.map((option, index) => (
              <Button
                key={index}
                variant="outline"
                className={cn(
                  "h-auto py-4 text-lg relative overflow-hidden border-[#e0e0e0] hover:border-[#1a75c1] hover:bg-[#e8f4fc]",
                  lastAnswer &&
                    questions[currentQuestionIndex] &&
                    options[index] === questions[currentQuestionIndex].definition &&
                    "border-green-500 bg-green-50",
                  lastAnswer &&
                    lastAnswer.isCorrect === false &&
                    lastAnswer.option === option &&
                    "border-red-500 bg-red-50",
                  // 在多人模式下，如果已經回答，禁用按鈕
                  gameMode === "multi" && hasAnswered && "opacity-70 cursor-not-allowed",
                )}
                onClick={() => {
                  if (!lastAnswer && !(gameMode === "multi" && hasAnswered)) {
                    handleAnswer(index, playerIdRef.current, playerName)
                  }
                }}
                disabled={gameMode === "multi" && hasAnswered}
              >
                {option}

                {lastAnswer &&
                  questions[currentQuestionIndex] &&
                  options[index] === questions[currentQuestionIndex].definition && (
                    <div className="absolute top-1 right-1">
                      <Check className="h-5 w-5 text-green-500" />
                    </div>
                  )}

                {lastAnswer && lastAnswer.isCorrect === false && lastAnswer.option === option && (
                  <div className="absolute top-1 right-1">
                    <X className="h-5 w-5 text-red-500" />
                  </div>
                )}
              </Button>
            ))}
          </div>

          {lastAnswer && (
            <div
              className={cn(
                "mt-4 p-3 rounded-md text-center",
                lastAnswer.isCorrect ? "bg-[#e8f4fc] text-[#1a75c1]" : "bg-[#fde8eb] text-[#e86d7f]",
              )}
            >
              {lastAnswer.isCorrect ? (
                <div className="flex items-center justify-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  <span>
                    {lastAnswer.playerName}
                    答對了！用時 {lastAnswer.time} 秒
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <X className="h-5 w-5" />
                  <span>
                    {lastAnswer.playerName}
                    答錯了！
                  </span>
                </div>
              )}
            </div>
          )}

          {gameMode === "multi" && hasAnswered && (
            <div className="mt-4 p-3 rounded-md text-center bg-yellow-50 text-yellow-700">
              <div className="flex items-center justify-center gap-2">
                <Clock className="h-5 w-5" />
                <span>已回答，等待對手回答或計時結束...</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
