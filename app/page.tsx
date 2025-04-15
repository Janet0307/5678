"use client"

import { useState, useEffect } from "react"
import { VocabGame } from "@/components/vocab-game"
import { DeploymentGuide } from "@/components/deployment-guide"
import { JoinByUrl } from "@/components/join-by-url"

export default function Home() {
  const [roomFromUrl, setRoomFromUrl] = useState<string | null>(null)
  const [showJoinForm, setShowJoinForm] = useState(false)

  useEffect(() => {
    // 檢查URL是否包含房間代碼
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search)
      const roomCode = urlParams.get("room")

      if (roomCode) {
        setRoomFromUrl(roomCode)
        setShowJoinForm(true)
      }
    }
  }, [])

  // 修改 handleJoinRoom 函數，確保正確設置連接狀態
  const handleJoinRoom = (playerName: string, roomCode: string) => {
    // 這裡我們只是隱藏加入表單，實際的加入邏輯在VocabGame組件中處理
    setShowJoinForm(false)

    // 保持URL中的房間代碼
    const newUrl = `${window.location.pathname}?room=${roomCode}`
    window.history.pushState({ path: newUrl }, "", newUrl)

    // 強制重新渲染VocabGame組件，確保連接正確建立
    setRoomFromUrl(null)
    setTimeout(() => {
      setRoomFromUrl(roomCode)
    }, 10)
  }

  const handleCancelJoin = () => {
    setShowJoinForm(false)
    // 移除URL中的房間代碼
    const newUrl = window.location.pathname
    window.history.pushState({ path: newUrl }, "", newUrl)
    setRoomFromUrl(null)
  }

  return (
    <main className="min-h-screen flex flex-col items-center bg-[#1a75c1]">
      <header className="w-full bg-gradient-to-r from-[#1a75c1] to-[#0d5ca0] py-3 px-4 flex justify-between items-center">
        <div className="flex items-center">
          <div className="bg-[#ffb400] text-white font-bold px-3 py-1 rounded-md mr-2 text-sm">108年</div>
          <div className="text-white text-sm">核心素養</div>
        </div>
        <div className="text-white text-sm">April 2025</div>
      </header>

      <div className="w-full max-w-4xl px-4 py-6">
        <div className="flex flex-col md:flex-row items-center mb-8">
          <div className="text-[#f8c537] text-4xl md:text-5xl font-bold mb-2 md:mb-0 md:mr-4 font-serif">常春藤</div>
          <div className="text-[#e86d7f] text-3xl md:text-4xl font-bold font-serif">單字配對遊戲</div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-lg">
          {showJoinForm && roomFromUrl ? (
            <JoinByUrl roomCode={roomFromUrl} onJoin={handleJoinRoom} onCancel={handleCancelJoin} />
          ) : (
            <VocabGame initialRoomCode={roomFromUrl} />
          )}

          {!showJoinForm && <DeploymentGuide />}
        </div>

        <div className="mt-4 text-white text-center text-sm">
          © 常春藤解析英語 {new Date().getFullYear()} All rights reserved.
        </div>
      </div>
    </main>
  )
}
