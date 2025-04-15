"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Users } from "lucide-react"

interface JoinByUrlProps {
  roomCode: string
  onJoin: (name: string, roomCode: string) => void
  onCancel: () => void
}

export function JoinByUrl({ roomCode, onJoin, onCancel }: JoinByUrlProps) {
  const [playerName, setPlayerName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 修改 handleJoin 函數，確保連接正確建立
  const handleJoin = () => {
    if (!playerName.trim()) {
      alert("請輸入您的名字")
      return
    }

    setIsSubmitting(true)

    // 模擬網絡請求，但不要延遲太久
    setTimeout(() => {
      onJoin(playerName, roomCode)
      setIsSubmitting(false)
    }, 100)
  }

  return (
    <Card className="p-6 max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="flex justify-center mb-4">
          <div className="bg-[#1a75c1] p-3 rounded-full">
            <Users className="h-8 w-8 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-[#1a75c1] mb-2">加入遊戲房間</h2>
        <p className="text-gray-600">
          您正在加入房間: <span className="font-bold">{roomCode}</span>
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="playerName" className="block text-sm font-medium text-gray-700 mb-1">
            您的名字
          </label>
          <Input
            id="playerName"
            placeholder="請輸入您的名字"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleJoin} className="flex-1 bg-[#1a75c1] hover:bg-[#0d5ca0]" disabled={isSubmitting}>
            {isSubmitting ? "加入中..." : "加入房間"}
          </Button>
          <Button variant="outline" onClick={onCancel} className="flex-1" disabled={isSubmitting}>
            取消
          </Button>
        </div>
      </div>
    </Card>
  )
}
