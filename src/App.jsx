import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Play, Pause, Upload, RotateCcw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import './App.css'

function App() {
  const [gameState, setGameState] = useState('idle') // idle, playing, paused, finished
  const [currentText, setCurrentText] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [accuracy, setAccuracy] = useState(100)
  const [totalTyped, setTotalTyped] = useState(0)
  const [correctTyped, setCorrectTyped] = useState(0)
  const [fallingTexts, setFallingTexts] = useState([])
  const [musicFile, setMusicFile] = useState(null)
  const [showEffect, setShowEffect] = useState(false)
  const [useDefaultMusic, setUseDefaultMusic] = useState(false)
  
  const audioContextRef = useRef(null)
  const audioSourceRef = useRef(null)
  const audioBufferRef = useRef(null)
  const gainNodeRef = useRef(null)
  const filterNodeRef = useRef(null)
  const startTimeRef = useRef(0)
  const pauseTimeRef = useRef(0)
  const inputRef = useRef(null)
  
  // 学びのあるテキストデータ
  const textData = [
    "The only way to do great work is to love what you do",
    "Innovation distinguishes between a leader and a follower",
    "Stay hungry stay foolish",
    "Think different",
    "Simplicity is the ultimate sophistication",
    "Design is not just what it looks like design is how it works",
    "Quality is more important than quantity",
    "Code is poetry",
    "Make it work make it right make it fast",
    "First solve the problem then write the code",
    "継続は力なり",
    "一期一会",
    "温故知新",
    "七転び八起き",
    "千里の道も一歩から"
  ]
  
  // Web Audio APIの初期化
  const initAudio = async (fileOrUrl) => {
    try {
      if (audioContextRef.current) {
        await audioContextRef.current.close()
      }
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      audioContextRef.current = audioContext
      
      let arrayBuffer
      if (typeof fileOrUrl === 'string') {
        // URLの場合
        const response = await fetch(fileOrUrl)
        arrayBuffer = await response.arrayBuffer()
      } else {
        // Fileオブジェクトの場合
        arrayBuffer = await fileOrUrl.arrayBuffer()
      }
      
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      audioBufferRef.current = audioBuffer
      
      // フィルターとゲインノードの作成
      const gainNode = audioContext.createGain()
      const filterNode = audioContext.createBiquadFilter()
      filterNode.type = 'lowpass'
      filterNode.frequency.value = 20000
      
      gainNodeRef.current = gainNode
      filterNodeRef.current = filterNode
      
      return true
    } catch (error) {
      console.error('Audio initialization error:', error)
      return false
    }
  }
  
  // 音楽の再生
  const playAudio = (offset = 0) => {
    if (!audioContextRef.current || !audioBufferRef.current) return
    
    if (audioSourceRef.current) {
      audioSourceRef.current.stop()
    }
    
    const source = audioContextRef.current.createBufferSource()
    source.buffer = audioBufferRef.current
    
    source.connect(filterNodeRef.current)
    filterNodeRef.current.connect(gainNodeRef.current)
    gainNodeRef.current.connect(audioContextRef.current.destination)
    
    audioSourceRef.current = source
    source.start(0, offset)
    startTimeRef.current = audioContextRef.current.currentTime - offset
  }
  
  // 音楽の一時停止
  const pauseAudio = () => {
    if (audioSourceRef.current && audioContextRef.current) {
      pauseTimeRef.current = audioContextRef.current.currentTime - startTimeRef.current
      audioSourceRef.current.stop()
    }
  }
  
  // タイピング成功時のエフェクト
  const applySuccessEffect = () => {
    if (!filterNodeRef.current || !gainNodeRef.current) return
    
    const now = audioContextRef.current.currentTime
    const intensity = Math.min(combo / 10, 1)
    
    // ハイパスフィルターエフェクト
    filterNodeRef.current.frequency.setValueAtTime(20000, now)
    filterNodeRef.current.frequency.exponentialRampToValueAtTime(
      800 + intensity * 2000,
      now + 0.05
    )
    filterNodeRef.current.frequency.exponentialRampToValueAtTime(20000, now + 0.3)
    
    // 音量ブースト
    gainNodeRef.current.gain.setValueAtTime(1, now)
    gainNodeRef.current.gain.linearRampToValueAtTime(1 + intensity * 0.3, now + 0.05)
    gainNodeRef.current.gain.linearRampToValueAtTime(1, now + 0.3)
    
    // ビジュアルエフェクト
    setShowEffect(true)
    setTimeout(() => setShowEffect(false), 300)
  }
  
  // ゲーム開始
  const startGame = async () => {
    let audioSource = musicFile
    
    if (!audioSource && useDefaultMusic) {
      audioSource = '/music/running-night.mp3'
    }
    
    if (!audioSource) {
      alert('音楽ファイルを選択してください')
      return
    }
    
    const success = await initAudio(audioSource)
    if (!success) {
      alert('音楽ファイルの読み込みに失敗しました')
      return
    }
    
    setGameState('playing')
    setScore(0)
    setCombo(0)
    setMaxCombo(0)
    setAccuracy(100)
    setTotalTyped(0)
    setCorrectTyped(0)
    setFallingTexts([])
    setInputValue('')
    
    playAudio(0)
    
    // テキストを定期的に生成
    const interval = setInterval(() => {
      const randomText = textData[Math.floor(Math.random() * textData.length)]
      const newText = {
        id: Date.now(),
        text: randomText,
        position: 0,
        speed: 0.5 + Math.random() * 0.5
      }
      setFallingTexts(prev => [...prev, newText])
    }, 3000)
    
    // 最初のテキストを即座に表示
    const firstText = textData[Math.floor(Math.random() * textData.length)]
    setCurrentText(firstText)
    setFallingTexts([{
      id: Date.now(),
      text: firstText,
      position: 0,
      speed: 0.5
    }])
    
    // 音楽終了時の処理
    setTimeout(() => {
      clearInterval(interval)
      setGameState('finished')
      if (audioSourceRef.current) {
        audioSourceRef.current.stop()
      }
    }, audioBufferRef.current.duration * 1000)
  }
  
  // ゲームの一時停止/再開
  const togglePause = () => {
    if (gameState === 'playing') {
      setGameState('paused')
      pauseAudio()
    } else if (gameState === 'paused') {
      setGameState('playing')
      playAudio(pauseTimeRef.current)
    }
  }
  
  // ゲームのリセット
  const resetGame = () => {
    if (audioSourceRef.current) {
      audioSourceRef.current.stop()
    }
    setGameState('idle')
    setScore(0)
    setCombo(0)
    setMaxCombo(0)
    setAccuracy(100)
    setTotalTyped(0)
    setCorrectTyped(0)
    setFallingTexts([])
    setInputValue('')
    setCurrentText('')
  }
  
  // ファイル選択
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file && file.type.startsWith('audio/')) {
      setMusicFile(file)
      setUseDefaultMusic(false)
    } else {
      alert('MP3形式の音楽ファイルを選択してください')
    }
  }
  
  // タイピング処理
  const handleTyping = (e) => {
    if (gameState !== 'playing') return
    
    const typed = e.target.value
    setInputValue(typed)
    
    if (currentText.startsWith(typed)) {
      setTotalTyped(prev => prev + 1)
      setCorrectTyped(prev => prev + 1)
      
      if (typed === currentText) {
        // 正解
        const points = 100 + combo * 10
        setScore(prev => prev + points)
        setCombo(prev => {
          const newCombo = prev + 1
          setMaxCombo(max => Math.max(max, newCombo))
          return newCombo
        })
        
        applySuccessEffect()
        
        // 次のテキストへ
        setInputValue('')
        setFallingTexts(prev => {
          const remaining = prev.filter(t => t.text !== currentText)
          if (remaining.length > 0) {
            setCurrentText(remaining[0].text)
          }
          return remaining
        })
      }
    } else {
      // ミス
      setTotalTyped(prev => prev + 1)
      setCombo(0)
    }
    
    // 精度の計算
    if (totalTyped > 0) {
      setAccuracy(Math.round((correctTyped / totalTyped) * 100))
    }
  }
  
  // テキストの落下アニメーション
  useEffect(() => {
    if (gameState !== 'playing') return
    
    const interval = setInterval(() => {
      setFallingTexts(prev => {
        return prev.map(text => ({
          ...text,
          position: text.position + text.speed
        })).filter(text => text.position < 100)
      })
    }, 50)
    
    return () => clearInterval(interval)
  }, [gameState])
  
  // 入力フィールドにフォーカス
  useEffect(() => {
    if (gameState === 'playing' && inputRef.current) {
      inputRef.current.focus()
    }
  }, [gameState])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black text-white flex flex-col items-center justify-center p-8">
      <h1 className="text-5xl font-bold mb-8 bg-gradient-to-r from-pink-500 to-cyan-500 bg-clip-text text-transparent">
        Typing Rhythm Game
      </h1>
      
      {gameState === 'idle' && (
        <div className="flex flex-col items-center gap-6 max-w-md">
          <div className="w-full">
            <label className="block mb-2 text-lg">音楽ファイルを選択 (MP3)</label>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="music-upload"
                />
                <label
                  htmlFor="music-upload"
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer transition-colors"
                >
                  <Upload className="w-5 h-5" />
                  ファイルを選択
                </label>
                {musicFile && (
                  <span className="text-sm text-gray-300">{musicFile.name}</span>
                )}
              </div>
              
              <div className="text-center text-gray-400">または</div>
              
              <Button
                onClick={() => {
                  setUseDefaultMusic(true)
                  setMusicFile(null)
                }}
                className={`w-full py-3 ${useDefaultMusic ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'}`}
              >
                {useDefaultMusic ? '✓ デフォルト曲を使用' : 'デフォルト曲を使用'}
              </Button>
            </div>
          </div>
          
          <Button
            onClick={startGame}
            disabled={!musicFile && !useDefaultMusic}
            className="w-full py-6 text-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
          >
            <Play className="w-6 h-6 mr-2" />
            ゲームスタート
          </Button>
          
          <div className="mt-8 text-center text-sm text-gray-400">
            <p>音楽に合わせて表示されるテキストをタイピングしよう！</p>
            <p className="mt-2">正確にタイピングするとコンボが繋がり、音楽にエフェクトがかかります</p>
          </div>
        </div>
      )}
      
      {(gameState === 'playing' || gameState === 'paused') && (
        <div className="w-full max-w-4xl">
          {/* スコアボード */}
          <div className="flex justify-between mb-8 text-xl">
            <div className="bg-black/50 px-6 py-3 rounded-lg">
              <span className="text-gray-400">Score: </span>
              <span className="font-bold text-yellow-400">{score}</span>
            </div>
            <div className="bg-black/50 px-6 py-3 rounded-lg">
              <span className="text-gray-400">Combo: </span>
              <span className="font-bold text-pink-400">{combo}</span>
            </div>
            <div className="bg-black/50 px-6 py-3 rounded-lg">
              <span className="text-gray-400">Accuracy: </span>
              <span className="font-bold text-cyan-400">{accuracy}%</span>
            </div>
          </div>
          
          {/* ゲームエリア */}
          <div className="relative h-96 bg-black/30 rounded-xl border-4 border-purple-500 overflow-hidden mb-8">
            <AnimatePresence>
              {fallingTexts.map(text => (
                <motion.div
                  key={text.id}
                  initial={{ y: 0, opacity: 0 }}
                  animate={{ 
                    y: `${text.position}%`,
                    opacity: text.position < 80 ? 1 : 1 - (text.position - 80) / 20
                  }}
                  exit={{ opacity: 0 }}
                  className={`absolute left-1/2 transform -translate-x-1/2 text-2xl font-bold px-6 py-3 rounded-lg ${
                    text.text === currentText 
                      ? 'bg-pink-500/80 text-white scale-110' 
                      : 'bg-gray-700/50 text-gray-400'
                  }`}
                  style={{ top: 0 }}
                >
                  {text.text}
                </motion.div>
              ))}
            </AnimatePresence>
            
            {/* エフェクトレイヤー */}
            <AnimatePresence>
              {showEffect && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1.2 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-gradient-to-r from-pink-500/30 to-cyan-500/30 pointer-events-none"
                />
              )}
            </AnimatePresence>
          </div>
          
          {/* 入力エリア */}
          <div className="flex flex-col items-center gap-4">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleTyping}
              disabled={gameState === 'paused'}
              className="w-full px-6 py-4 text-2xl bg-black/50 border-2 border-cyan-500 rounded-lg text-white focus:outline-none focus:border-pink-500 transition-colors"
              placeholder="ここにタイピング..."
            />
            
            <div className="flex gap-4">
              <Button
                onClick={togglePause}
                className="px-8 py-4 bg-yellow-600 hover:bg-yellow-700"
              >
                {gameState === 'playing' ? (
                  <>
                    <Pause className="w-5 h-5 mr-2" />
                    一時停止
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    再開
                  </>
                )}
              </Button>
              
              <Button
                onClick={resetGame}
                className="px-8 py-4 bg-red-600 hover:bg-red-700"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                リセット
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {gameState === 'finished' && (
        <div className="flex flex-col items-center gap-6 max-w-md">
          <h2 className="text-4xl font-bold text-yellow-400">ゲーム終了！</h2>
          
          <div className="w-full bg-black/50 rounded-xl p-8 space-y-4">
            <div className="flex justify-between text-xl">
              <span>最終スコア:</span>
              <span className="font-bold text-yellow-400">{score}</span>
            </div>
            <div className="flex justify-between text-xl">
              <span>最大コンボ:</span>
              <span className="font-bold text-pink-400">{maxCombo}</span>
            </div>
            <div className="flex justify-between text-xl">
              <span>精度:</span>
              <span className="font-bold text-cyan-400">{accuracy}%</span>
            </div>
          </div>
          
          <Button
            onClick={resetGame}
            className="w-full py-6 text-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
          >
            <RotateCcw className="w-6 h-6 mr-2" />
            もう一度プレイ
          </Button>
        </div>
      )}
    </div>
  )
}

export default App
