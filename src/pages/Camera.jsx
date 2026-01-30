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
        await tf.ready()
        const model = await blazeface.load()
        modelRef.current = model
      } catch (err) {
        console.error('Ошибка загрузки модели:', err)
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
          videoRef.current.onloadedmetadata = () => {
            setIsLoading(false)
            startFaceDetection()
          }
        }
      } catch (err) {
        setError('Не удалось получить доступ к камере. Проверьте разрешения.')
        console.error(err)
        setIsLoading(false)
      }
    }

    async function startFaceDetection() {
      if (!videoRef.current || !modelRef.current) return

      const video = videoRef.current
      const model = modelRef.current

      // Создаем скрытый canvas для обработки
      if (!canvasRef.current) {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth || 640
        canvas.height = video.videoHeight || 480
        canvasRef.current = canvas
      }

      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')

      async function detectFace() {
        if (!video || video.readyState !== video.HAVE_ENOUGH_DATA || !model) {
          animationFrameRef.current = requestAnimationFrame(detectFace)
          return
        }

        try {
          // Рисуем текущий кадр на canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

          // Обнаруживаем лица
          const predictions = await model.estimateFaces(video, false)

          if (predictions.length > 0) {
            setIsFaceDetected(true)
            const face = predictions[0]

            // Получаем координаты центра лица
            const faceCenterX = (face.topLeft[0] + face.bottomRight[0]) / 2
            const faceCenterY = (face.topLeft[1] + face.bottomRight[1]) / 2

            // Получаем размеры видео и овала
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

            // Преобразуем координаты лица из координат видео в координаты экрана
            const videoDisplayWidth = screenWidth
            const videoDisplayHeight = screenWidth / videoAspect
            const videoDisplayOffsetY = (screenHeight - videoDisplayHeight) / 2

            const faceScreenX = (faceCenterX / videoWidth) * videoDisplayWidth
            const faceScreenY = (faceCenterY / videoHeight) * videoDisplayHeight + videoDisplayOffsetY

            // Проверяем, находится ли лицо в овале
            const dx = (faceScreenX - ovalScreenX) / (ovalWidth / 2)
            const dy = (faceScreenY - ovalScreenY) / (ovalHeight / 2)
            const distance = Math.sqrt(dx * dx + dy * dy)

            const inOval = distance < 0.8 // 80% от размера овала для допуска

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

      detectFace()
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
        {isLoading && <p className="camera-loading">Запрашиваем доступ к камере...</p>}
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

