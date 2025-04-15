"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Copy, Check, ExternalLink } from "lucide-react"

export function DeploymentGuide() {
  const [copied, setCopied] = useState(false)

  const deploymentSteps = [
    "1. 註冊 Vercel 帳號 (https://vercel.com)",
    "2. 點擊 'Add New...' > 'Project'",
    "3. 連接您的 GitHub 帳號並選擇您的專案",
    "4. 點擊 'Deploy'",
    "5. 部署完成後，您將獲得一個可以直接分享的 URL",
  ]

  const copyToClipboard = () => {
    navigator.clipboard.writeText("https://vocab-game.vercel.app")
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="p-4 mt-6 border border-[#1a75c1]/30">
      <h3 className="text-lg font-medium mb-2 text-[#1a75c1]">如何獲得遊戲連結</h3>
      <p className="text-sm text-gray-600 mb-3">
        要獲得一個可以直接在瀏覽器中打開的遊戲連結，您需要將此專案部署到 Vercel：
      </p>
      <ul className="text-sm text-gray-600 mb-4 space-y-1">
        {deploymentSteps.map((step, index) => (
          <li key={index}>{step}</li>
        ))}
      </ul>
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-100 p-2 rounded text-sm overflow-hidden text-ellipsis">
          https://vocab-game.vercel.app
        </div>
        <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={copyToClipboard}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "已複製" : "複製"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1"
          onClick={() => window.open("https://vercel.com", "_blank")}
        >
          <ExternalLink className="h-4 w-4" />
          Vercel
        </Button>
      </div>
    </Card>
  )
}
