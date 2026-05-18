// src/components/Loading.jsx
import { useState, useEffect } from 'react'

export default function Loading() {
  const [progress, setProgress] = useState(0)
  const [messageIndex, setMessageIndex] = useState(0)

  const messages = [
    "Lacing up running shoes...",
    "Warming up...",
    "Taking first steps...",
    "Finding rhythm...",
    "Picking up pace...",
    "Halfway there!",
    "Almost finished!",
    "Final sprint!",
    "Cooling down..."
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + 1
        if (newProgress <= 100) {
          // Update message based on progress
          const messageIdx = Math.floor((newProgress / 100) * messages.length)
          setMessageIndex(Math.min(messageIdx, messages.length - 1))
          return newProgress
        }
        return prev
      })
    }, 50)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Runner Animation */}
        <div className="relative mb-8">
          {/* Running Track */}
          <div className="h-2 bg-gray-200 rounded-full mb-8">
            <div 
              className="h-2 bg-gradient-to-r from-green-400 to-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Runner SVG Animation */}
          <div className="relative h-32 flex items-center justify-center">
            <div 
              className="absolute left-0 transform transition-all duration-300"
              style={{ left: `${progress}%`, transform: 'translateX(-50%)' }}
            >
              <div className="relative animate-bounce">
                {/* Runner Person SVG */}
                <svg 
                  width="60" 
                  height="60" 
                  viewBox="0 0 60 60" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                  className="drop-shadow-lg"
                >
                  {/* Head */}
                  <circle cx="30" cy="15" r="8" fill="#FBBF24" className="animate-pulse" />
                  
                  {/* Body */}
                  <rect x="26" y="23" width="8" height="20" fill="#3B82F6" rx="2" />
                  
                  {/* Arms - animated */}
                  <g className="animate-[running_0.5s_ease-in-out_infinite] origin-top">
                    {/* Left Arm */}
                    <rect 
                      x="18" 
                      y="23" 
                      width="6" 
                      height="16" 
                      fill="#3B82F6" 
                      rx="2"
                      transform="rotate(-20 21 31)"
                    />
                    {/* Right Arm */}
                    <rect 
                      x="36" 
                      y="23" 
                      width="6" 
                      height="16" 
                      fill="#3B82F6" 
                      rx="2"
                      transform="rotate(20 39 31)"
                    />
                  </g>
                  
                  {/* Legs - animated */}
                  <g className="animate-[running_0.5s_ease-in-out_infinite_reverse] origin-top">
                    {/* Left Leg */}
                    <rect 
                      x="22" 
                      y="43" 
                      width="6" 
                      height="16" 
                      fill="#2563EB" 
                      rx="2"
                      transform="rotate(15 25 51)"
                    />
                    {/* Right Leg */}
                    <rect 
                      x="32" 
                      y="43" 
                      width="6" 
                      height="16" 
                      fill="#2563EB" 
                      rx="2"
                      transform="rotate(-15 35 51)"
                    />
                  </g>
                  
                  {/* Running Shoes */}
                  <circle cx="21" cy="57" r="4" fill="#DC2626" />
                  <circle cx="39" cy="57" r="4" fill="#DC2626" />
                  
                  {/* Sweat Drops */}
                  <circle cx="40" cy="20" r="2" fill="#93C5FD" className="animate-ping" />
                  <circle cx="45" cy="25" r="2" fill="#93C5FD" className="animate-ping delay-100" />
                  <circle cx="42" cy="30" r="2" fill="#93C5FD" className="animate-ping delay-200" />
                </svg>
              </div>
            </div>
          </div>

          {/* Track Markers */}
          <div className="flex justify-between mt-4 px-2">
            {[...Array(10)].map((_, i) => (
              <div 
                key={i} 
                className={`h-2 w-2 rounded-full ${
                  i * 10 <= progress ? 'bg-green-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Message and Progress */}
        <div className="text-center space-y-4">
          <p className="text-xl font-semibold text-gray-800 animate-pulse">
            {messages[messageIndex]}
          </p>
          
          <div className="text-4xl font-bold text-blue-600">
            {progress}%
          </div>

          {/* Motivational Message */}
          <p className="text-sm text-gray-500 italic">
            {progress === 100 
              ? "🏁 Finish line! Ready to go!" 
              : "Keep going! You're doing great! 🏃"}
          </p>
        </div>

        {/* Fun Facts (optional) */}
        {progress === 50 && (
          <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200 animate-bounce">
            <p className="text-sm text-yellow-800">
              ⭐ Fun Fact: Halfway there! Just like a marathon runner at the 13.1 mile mark!
            </p>
          </div>
        )}
      </div>

      {/* Add custom animation keyframes */}
      <style jsx>{`
        @keyframes running {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(20deg); }
          75% { transform: rotate(-20deg); }
        }
      `}</style>
    </div>
  )
}