"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shuffle, RefreshCw, Trophy, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

// Vocabulary data organized by date
const vocabularyByDate = {
  "Apr. 1": [
    { id: 1, word: "portray", definition: "描繪", note: "vt." },
    { id: 2, word: "be portrayed as...", definition: "被描繪成...", note: "片語" },
    { id: 3, word: "tendency", definition: "傾向", note: "n." },
    { id: 4, word: "distribute", definition: "分發", note: "vt." },
    { id: 5, word: "translate", definition: "翻譯", note: "vt." },
    { id: 6, word: "translate A into B", definition: "把A翻譯成B", note: "片語" },
    { id: 7, word: "occupied", definition: "被佔據的", note: "a." },
    { id: 8, word: "victim", definition: "受害者", note: "n." },
    { id: 9, word: "landmark", definition: "地標", note: "n." },
    { id: 10, word: "mental", definition: "心理的、精神的", note: "a." },
    { id: 11, word: "suicide", definition: "自殺", note: "n." },
  ],
  "Apr. 3": [
    { id: 12, word: "fort", definition: "堡壘", note: "n." },
    { id: 13, word: "interaction", definition: "互動", note: "n." },
    { id: 14, word: "interaction between A and B", definition: "A與B之間的互動", note: "片語" },
    { id: 15, word: "mountainous", definition: "多山的", note: "a." },
    { id: 16, word: "shift", definition: "轉變", note: "n." },
    { id: 17, word: "occasional", definition: "偶爾的", note: "a." },
    { id: 18, word: "recognition", definition: "認可、承認", note: "n." },
    { id: 19, word: "container", definition: "容器", note: "n." },
    { id: 20, word: "insufficient", definition: "不足的", note: "a." },
    { id: 21, word: "cargo", definition: "貨物", note: "n." },
    { id: 22, word: "adapt", definition: "適應", note: "vi." },
    { id: 23, word: "economic", definition: "經濟的", note: "a." },
    { id: 24, word: "significance", definition: "重要性", note: "n." },
  ],
  "Apr. 4": [
    { id: 25, word: "harbor", definition: "港口", note: "n." },
    { id: 26, word: "density", definition: "密度", note: "n." },
    { id: 27, word: "scattered", definition: "分散的", note: "a." },
    { id: 28, word: "be scattered across...", definition: "分布在...", note: "片語" },
    { id: 29, word: "combination", definition: "組合", note: "n." },
    { id: 30, word: "a combination of A and B", definition: "A與B的組合", note: "片語" },
    { id: 31, word: "specialty", definition: "專長、特產", note: "n." },
    { id: 32, word: "satisfying", definition: "令人滿意的", note: "a." },
    { id: 33, word: "eager", definition: "渴望的", note: "a." },
    { id: 34, word: "be eager to V", definition: "渴望做某事", note: "片語" },
    { id: 35, word: "boast", definition: "以擁有...自豪", note: "vt." },
    { id: 36, word: "formation", definition: "形成", note: "n." },
    { id: 37, word: "atmosphere", definition: "氣氛", note: "n." },
    { id: 38, word: "contrast", definition: "對比", note: "n." },
    { id: 39, word: "defense", definition: "防禦", note: "n." },
  ],
  "Apr. 7": [
    { id: 40, word: "nominate", definition: "提名", note: "vt." },
    { id: 41, word: "classic", definition: "經典的", note: "a." },
    { id: 42, word: "endless", definition: "無盡的", note: "a." },
    { id: 43, word: "generation", definition: "世代", note: "n." },
    { id: 44, word: "cherish", definition: "珍惜", note: "vt." },
    { id: 45, word: "entry", definition: "參賽作品；進入", note: "n." },
    { id: 46, word: "panel", definition: "評審團、小組", note: "n." },
    { id: 47, word: "beloved", definition: "深受喜愛的", note: "a." },
    { id: 48, word: "celebration", definition: "慶祝", note: "n." },
    { id: 49, word: "lightweight", definition: "輕量的", note: "a." },
    { id: 50, word: "adore", definition: "喜愛", note: "vt." },
    { id: 51, word: "endure", definition: "忍受", note: "vi." },
    { id: 52, word: "have one's moment", definition: "成名的一刻", note: "片語" },
    { id: 53, word: "make the cut", definition: "入選、達標", note: "片語" },
  ],
}

type CardType = {
  id: number
  content: string
  type: "word" | "definition"
  matchId: number
  isFlipped: boolean
  isMatched: boolean
  note?: string
}

export function MatchingGame() {
  const [selectedDate, setSelectedDate] = useState<string>("Apr. 1")
  const [cards, setCards] = useState<CardType[]>([])
  const [flippedCards, setFlippedCards] = useState<number[]>([])
  const [matchedPairs, setMatchedPairs] = useState<number>(0)
  const [moves, setMoves] = useState<number>(0)
  const [gameComplete, setGameComplete] = useState<boolean>(false)
  const [timer, setTimer] = useState<number>(0)
  const [isActive, setIsActive] = useState<boolean>(false)

  // Initialize game when date changes
  useEffect(() => {
    initializeGame()
  }, [selectedDate])

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isActive && !gameComplete) {
      interval = setInterval(() => {
        setTimer((timer) => timer + 1)
      }, 1000)
    } else if (!isActive && interval) {
      clearInterval(interval)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isActive, gameComplete])

  // Check for game completion
  useEffect(() => {
    const totalPairs = vocabularyByDate[selectedDate].length
    if (matchedPairs === totalPairs && matchedPairs > 0) {
      setGameComplete(true)
      setIsActive(false)
    }
  }, [matchedPairs, selectedDate])

  // Check for matches when two cards are flipped
  useEffect(() => {
    if (flippedCards.length === 2) {
      const firstCard = cards.find((card) => card.id === flippedCards[0])
      const secondCard = cards.find((card) => card.id === flippedCards[1])

      setMoves((moves) => moves + 1)

      if (firstCard && secondCard && firstCard.matchId === secondCard.matchId && firstCard.type !== secondCard.type) {
        // Match found
        setCards((prevCards) =>
          prevCards.map((card) =>
            card.id === firstCard.id || card.id === secondCard.id ? { ...card, isMatched: true } : card,
          ),
        )
        setMatchedPairs((matchedPairs) => matchedPairs + 1)
        setFlippedCards([])
      } else {
        // No match, flip back after delay
        setTimeout(() => {
          setFlippedCards([])
        }, 1000)
      }
    }
  }, [flippedCards, cards])

  const initializeGame = () => {
    // Create cards from vocabulary for the selected date
    let newCards: CardType[] = []
    const vocabulary = vocabularyByDate[selectedDate]

    vocabulary.forEach((item) => {
      // Word card
      newCards.push({
        id: item.id * 2 - 1,
        content: item.word,
        type: "word",
        matchId: item.id,
        isFlipped: false,
        isMatched: false,
        note: item.note,
      })

      // Definition card
      newCards.push({
        id: item.id * 2,
        content: item.definition,
        type: "definition",
        matchId: item.id,
        isFlipped: false,
        isMatched: false,
      })
    })

    // Shuffle cards
    newCards = shuffleArray(newCards)

    setCards(newCards)
    setFlippedCards([])
    setMatchedPairs(0)
    setMoves(0)
    setGameComplete(false)
    setTimer(0)
    setIsActive(false)
  }

  const handleCardClick = (id: number) => {
    // Don't allow more than 2 cards flipped at once
    if (flippedCards.length === 2) return

    // Don't allow clicking already flipped or matched cards
    const clickedCard = cards.find((card) => card.id === id)
    if (!clickedCard || clickedCard.isFlipped || clickedCard.isMatched) return

    // Start timer on first card click
    if (!isActive) {
      setIsActive(true)
    }

    // Flip the card
    setCards((prevCards) => prevCards.map((card) => (card.id === id ? { ...card, isFlipped: true } : card)))

    setFlippedCards((prev) => [...prev, id])
  }

  const shuffleArray = (array: CardType[]) => {
    const newArray = [...array]
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[newArray[i], newArray[j]] = [newArray[j], newArray[i]]
    }
    return newArray
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleDateChange = (date: string) => {
    setSelectedDate(date)
  }

  return (
    <div className="w-full max-w-4xl">
      <Tabs defaultValue="Apr. 1" onValueChange={handleDateChange} className="mb-6">
        <div className="flex items-center mb-2">
          <Calendar className="mr-2 h-4 w-4 text-sky-700" />
          <span className="font-medium text-sky-700">Select Vocabulary Set:</span>
        </div>
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="Apr. 1">Apr. 1</TabsTrigger>
          <TabsTrigger value="Apr. 3">Apr. 3</TabsTrigger>
          <TabsTrigger value="Apr. 4">Apr. 4</TabsTrigger>
          <TabsTrigger value="Apr. 7">Apr. 7</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
        <div className="flex gap-2">
          <Badge variant="outline" className="text-sm px-3 py-1">
            Time: {formatTime(timer)}
          </Badge>
          <Badge variant="outline" className="text-sm px-3 py-1">
            Moves: {moves}
          </Badge>
          <Badge variant="outline" className="text-sm px-3 py-1">
            Pairs: {matchedPairs}/{vocabularyByDate[selectedDate].length}
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={initializeGame} className="flex items-center gap-1">
          <RefreshCw className="h-4 w-4" /> Restart
        </Button>
      </div>

      {gameComplete ? (
        <div className="bg-white rounded-lg p-6 shadow-lg text-center">
          <div className="flex justify-center mb-4">
            <Trophy className="h-16 w-16 text-yellow-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2">恭喜完成!</h2>
          <p className="mb-4">
            You completed the {selectedDate} set in {formatTime(timer)} with {moves} moves.
          </p>
          <Button onClick={initializeGame} className="flex items-center gap-2">
            <Shuffle className="h-4 w-4" /> Play Again
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {cards.map((card) => (
            <Card
              key={card.id}
              className={cn(
                "h-28 md:h-36 flex flex-col items-center justify-center p-2 cursor-pointer transition-all duration-300 transform",
                card.isFlipped || card.isMatched ? "bg-white" : "bg-sky-600 hover:bg-sky-700",
                card.isMatched && "opacity-70",
              )}
              onClick={() => handleCardClick(card.id)}
            >
              {card.isFlipped || card.isMatched ? (
                <div className="flex flex-col items-center text-center">
                  <span
                    className={cn(
                      "text-center font-medium",
                      card.type === "word" ? "text-sky-800" : "text-emerald-700",
                    )}
                  >
                    {card.content}
                  </span>
                  {card.note && <span className="text-xs text-gray-500 mt-1">{card.note}</span>}
                </div>
              ) : (
                <span className="text-white text-xl">?</span>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
