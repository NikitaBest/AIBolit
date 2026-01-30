import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as tf from '@tensorflow/tfjs'
import * as blazeface from '@tensorflow-models/blazeface'
import Page from '../layout/Page.jsx'
import Modal from '../ui/Modal.jsx'
import './Camera.css'

function Camera() {
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const modelRef = useRef(null)
  const animationFrameRef = useRef(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [instructionText, setInstructionText] = useState('Поместите лицо в овал и не двигайтесь')
  const [isFaceDetected, setIsFaceDetected] = useState(false)
  const [isFaceInOval, setIsFaceInOval] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)

  const handleCancelClick = () => {
    setShowCancelModal(true)
  }

  const handleContinue = () => {
    setShowCancelModal(false)
  }

  const handleExit = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    setShowCancelModal(false)
    navigate(-1)
  }

  // Загрузка модели BlazeFace
  useEffect(() => {
    async function loadModel() {
      try {
        console.log('Начало загрузки TensorFlow...')
        await tf.ready()
        console.log('TensorFlow готов, загрузка BlazeFace...')
        const model = await blazeface.load()
        modelRef.current = model
        console.log('Модель BlazeFace загружена успешно')
      } catch (err) {
        console.error('Ошибка загрузки модели:', err)
        setError('Не удалось загрузить модель распознавания лиц')
      }
    }
    loadModel()
  }, [])

  // Инициализация камеры и отслеживание лица
  useEffect(() => {
    let stream

    async function initCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Ваше устройство не поддерживает доступ к камере.')
        setIsLoading(false)
        return
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        })

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          
          // Ждем загрузки видео и модели перед началом отслеживания
          videoRef.current.onloadedmetadata = async () => {
            console.log('Видео метаданные загружены', {
              videoWidth: videoRef.current.videoWidth,
              videoHeight: videoRef.current.videoHeight
            })
            setIsLoading(false)
            
            // Ждем загрузки модели перед началом отслеживания
            if (!modelRef.current) {
              console.log('Ожидание загрузки модели...')
              const waitForModel = setInterval(() => {
                if (modelRef.current) {
                  clearInterval(waitForModel)
                  console.log('Модель загружена, начинаем отслеживание')
                  startFaceDetection()
                }
              }, 100)
              
              // Таймаут на случай, если модель не загрузится
              setTimeout(() => {
                clearInterval(waitForModel)
                if (modelRef.current) {
                  startFaceDetection()
                } else {
                  console.error('Модель не загрузилась за отведенное время')
                }
              }, 10000)
            } else {
              startFaceDetection()
            }
          }
        }
      } catch (err) {
        setError('Не удалось получить доступ к камере. Проверьте разрешения.')
        console.error(err)
        setIsLoading(false)
      }
    }

    async function startFaceDetection() {
      if (!videoRef.current) {
        console.log('Видео не готово')
        return
      }
      if (!modelRef.current) {
        console.log('Модель не загружена, ожидание...')
        // Ждем загрузки модели
        const checkModel = setInterval(() => {
          if (modelRef.current) {
            clearInterval(checkModel)
            startFaceDetection()
          }
        }, 100)
        return
      }

      const video = videoRef.current
      const model = modelRef.current

      console.log('Начало отслеживания лица', {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        readyState: video.readyState
      })

      // Создаем скрытый canvas для обработки
      if (!canvasRef.current) {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth || 640
        canvas.height = video.videoHeight || 480
        canvasRef.current = canvas
        console.log('Canvas создан:', canvas.width, 'x', canvas.height)
      }

      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')

      async function detectFace() {
        if (!video || !model) {
          animationFrameRef.current = requestAnimationFrame(detectFace)
          return
        }

        if (video.readyState !== video.HAVE_ENOUGH_DATA) {
          animationFrameRef.current = requestAnimationFrame(detectFace)
          return
        }

        try {
          // Обновляем размеры canvas если нужно
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
          }

          // Обнаруживаем лица напрямую из видео
          const predictions = await model.estimateFaces(video, false)
          
          if (predictions.length > 0) {
            setIsFaceDetected(true)
            const face = predictions[0]

            // Получаем размеры видео
            const videoWidth = video.videoWidth || canvas.width
            const videoHeight = video.videoHeight || canvas.height
            const videoAspect = videoWidth / videoHeight

            // Вычисляем размеры овала на экране
            const screenWidth = window.innerWidth
            const screenHeight = window.innerHeight
            const ovalWidth = Math.min(298, screenWidth * 0.8)
            const ovalHeight = (409 / 298) * ovalWidth

            // Центр овала на экране (50% по горизонтали, 50% по вертикали)
            const ovalScreenX = screenWidth / 2
            const ovalScreenY = screenHeight / 2

            // Преобразуем координаты видео в координаты экрана
            const videoDisplayWidth = screenWidth
            const videoDisplayHeight = screenWidth / videoAspect
            const videoDisplayOffsetY = (screenHeight - videoDisplayHeight) / 2

            // Преобразуем границы лица в координаты экрана
            const faceTopLeftScreenX = (face.topLeft[0] / videoWidth) * videoDisplayWidth
            const faceTopLeftScreenY = (face.topLeft[1] / videoHeight) * videoDisplayHeight + videoDisplayOffsetY
            const faceBottomRightScreenX = (face.bottomRight[0] / videoWidth) * videoDisplayWidth
            const faceBottomRightScreenY = (face.bottomRight[1] / videoHeight) * videoDisplayHeight + videoDisplayOffsetY

            // Получаем центр лица
            const faceCenterX = (faceTopLeftScreenX + faceBottomRightScreenX) / 2
            const faceCenterY = (faceTopLeftScreenY + faceBottomRightScreenY) / 2

            // Размеры лица
            const faceWidth = faceBottomRightScreenX - faceTopLeftScreenX
            const faceHeight = faceBottomRightScreenY - faceTopLeftScreenY

            // Проверяем, что лицо находится внутри овала
            // Используем уравнение эллипса: (x-cx)²/a² + (y-cy)²/b² <= 1
            const a = ovalWidth / 2
            const b = ovalHeight / 2

            // Проверяем точки лица с более гибким допуском
            const checkPoint = (x, y) => {
              const dx = (x - ovalScreenX) / a
              const dy = (y - ovalScreenY) / b
              return (dx * dx + dy * dy) <= 0.95 // 95% от размера овала для допуска
            }

            // Проверяем центр лица (главный критерий)
            const centerIn = checkPoint(faceCenterX, faceCenterY)

            // Проверяем углы лица (должно быть минимум 3 из 4 внутри)
            const topLeftIn = checkPoint(faceTopLeftScreenX, faceTopLeftScreenY)
            const topRightIn = checkPoint(faceBottomRightScreenX, faceTopLeftScreenY)
            const bottomLeftIn = checkPoint(faceTopLeftScreenX, faceBottomRightScreenY)
            const bottomRightIn = checkPoint(faceBottomRightScreenX, faceBottomRightScreenY)

            const cornersIn = [topLeftIn, topRightIn, bottomLeftIn, bottomRightIn].filter(Boolean).length
            const mostCornersIn = cornersIn >= 3 // Минимум 3 из 4 углов должны быть внутри

            // Проверяем размер лица (более гибкие границы)
            const faceSizeRatio = Math.max(faceWidth / ovalWidth, faceHeight / ovalHeight)
            const sizeValid = faceSizeRatio >= 0.3 && faceSizeRatio <= 0.95 // Лицо должно занимать 30-95% овала

            // Лицо считается в овале, если центр внутри И большинство углов внутри И размер подходящий
            const inOval = centerIn && mostCornersIn && sizeValid

            setIsFaceInOval(inOval)

            if (inOval) {
              setInstructionText('Отлично! Держите лицо неподвижно')
            } else {
              setInstructionText('Поместите лицо в овал и не двигайтесь')
            }
          } else {
            setIsFaceDetected(false)
            setIsFaceInOval(false)
            setInstructionText('Поместите лицо в овал')
          }
        } catch (err) {
          console.error('Ошибка обнаружения лица:', err)
        }

        animationFrameRef.current = requestAnimationFrame(detectFace)
      }

      // Запускаем обнаружение с небольшой задержкой для стабилизации видео
      setTimeout(() => {
        detectFace()
      }, 500)
    }

    initCamera()

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return (
    <div className="camera-page">
      <div className="camera-preview">
        {isLoading && (
          <div className="camera-loading-container">
            <div className="camera-loading-spinner"></div>
            <p className="camera-loading-text">Запрашиваем доступ к камере...</p>
          </div>
        )}
        {error && <p className="error-text">{error}</p>}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`camera-video ${error ? 'hidden' : ''}`}
        />
        {!error && !isLoading && (
          <>
            <div className="camera-overlay"></div>
            <div className="face-oval-container">
              <svg 
                className={`face-oval ${isFaceInOval ? 'face-oval-success' : isFaceDetected ? 'face-oval-warning' : ''}`}
                width="298" 
                height="409" 
                viewBox="0 0 298 409" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <mask id="mask0_138_3429" style={{maskType: 'alpha'}} maskUnits="userSpaceOnUse" x="0" y="0" width="298" height="409">
                  <ellipse cx="149" cy="204.5" rx="143" ry="198.5" stroke="black" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round"/>
                </mask>
                <g mask="url(#mask0_138_3429)">
                  <ellipse cx="149.5" cy="204.5" rx="154.5" ry="210.5" fill="#D3E8F4"/>
                </g>
                <ellipse 
                  cx="149" 
                  cy="204.5" 
                  rx="143" 
                  ry="198.5" 
                  stroke="currentColor" 
                  strokeWidth="12" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </div>
            <div className="camera-instruction-container">
              <p className="camera-instruction-text">
                {instructionText}
              </p>
            </div>
            <button className="camera-cancel-button" onClick={handleCancelClick} type="button">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Отменить анализ</span>
            </button>
          </>
        )}
      </div>
      <Modal
        isOpen={showCancelModal}
        onClose={handleContinue}
        title="Прервать сканирование?"
        description="Прогресс не сохранится."
        onConfirm={handleContinue}
        confirmText="Продолжить"
        cancelText="Выйти"
        onCancel={handleExit}
      />
    </div>
  )
}

export default Camera

