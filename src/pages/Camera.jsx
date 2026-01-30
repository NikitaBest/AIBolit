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
  const ovalRef = useRef(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [instructionText, setInstructionText] = useState('Поместите лицо в овал и не двигайтесь')
  const [isFaceDetected, setIsFaceDetected] = useState(false)
  const [isFaceInOval, setIsFaceInOval] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [scanProgress, setScanProgress] = useState(0) // Прогресс сканирования 0-100
  const [scanStage, setScanStage] = useState('') // Текущий этап сканирования
  const scanIntervalRef = useRef(null) // Референс для интервала сканирования
  const scanStartTimeRef = useRef(null) // Время начала сканирования
  
  // Параметры для точной настройки обнаружения лица
  const faceDetectionConfig = {
    // Допуск для проверки точек (0.85 = строже, 0.95 = мягче)
    // Чем меньше значение, тем строже проверка
    pointTolerance: 0.90, // 90% от размера овала
    
    // Минимальное количество углов лица, которые должны быть внутри овала (1-4)
    // Чем больше значение, тем строже проверка
    minCornersInOval: 3, // Минимум 3 из 4 углов
    
    // Размер лица относительно овала (в процентах)
    // minSize: минимальный размер лица (30% = лицо должно занимать минимум 30% овала)
    // maxSize: максимальный размер лица (95% = лицо не должно быть больше 95% овала)
    minFaceSize: 0.35, // 35% - лицо не должно быть слишком маленьким
    maxFaceSize: 0.90, // 90% - лицо не должно быть слишком большим
    
    // Стабильность: лицо должно быть в овале несколько кадров подряд
    // Это предотвращает ложные срабатывания при движении
    stabilityFrames: 3, // Лицо должно быть в овале 3 кадра подряд
  }
  
  const stabilityRef = useRef(0) // Счетчик стабильных кадров

  // Этапы сканирования с процентами
  const scanStages = [
    { progress: 0, text: 'Калибровка освещения...' },
    { progress: 25, text: 'Измеряем пульс...' },
    { progress: 46, text: 'Анализируем здоровье...' },
    { progress: 68, text: 'Почти готово...' },
    { progress: 82, text: 'Завершение анализа...' },
    { progress: 100, text: 'Готово!' },
  ]

  // Запуск сканирования
  useEffect(() => {
    if (isFaceInOval && !scanIntervalRef.current) {
      // Начинаем сканирование
      scanStartTimeRef.current = Date.now()
      setScanProgress(0)
      setScanStage(scanStages[0].text)

      const totalDuration = 50000 // 50 секунд в миллисекундах
      const updateInterval = 100 // Обновляем каждые 100мс для плавности

      scanIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - scanStartTimeRef.current
        const progress = Math.min(100, (elapsed / totalDuration) * 100)
        setScanProgress(progress)

        // Обновляем этап сканирования в зависимости от прогресса
        const currentStage = scanStages.find((stage, index) => {
          const nextStage = scanStages[index + 1]
          return progress >= stage.progress && (!nextStage || progress < nextStage.progress)
        })
        if (currentStage) {
          setScanStage(currentStage.text)
        }

        // Завершение сканирования
        if (progress >= 100) {
          clearInterval(scanIntervalRef.current)
          scanIntervalRef.current = null
          // Здесь будет подключение к сервису анализа
          console.log('Сканирование завершено, готово к подключению сервиса')
        }
      }, updateInterval)
    } else if (!isFaceInOval && scanIntervalRef.current) {
      // Сбрасываем сканирование, если лицо ушло
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
      scanStartTimeRef.current = null
      setScanProgress(0)
      setScanStage('')
    }

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current)
        scanIntervalRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFaceInOval])

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
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
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

            // Получаем реальные размеры SVG овала на экране
            const screenWidth = window.innerWidth
            const screenHeight = window.innerHeight
            
            // Параметры овала из SVG (viewBox: 298x409, ellipse: cx=149, cy=204.5, rx=143, ry=198.5)
            const svgViewBoxWidth = 298
            const svgViewBoxHeight = 409
            const svgOvalCenterX = 149
            const svgOvalCenterY = 204.5
            const svgOvalRadiusX = 143
            const svgOvalRadiusY = 198.5

            // Получаем реальные размеры SVG элемента на экране
            let ovalScreenWidth = Math.min(298, screenWidth * 0.8)
            let ovalScreenHeight = (svgViewBoxHeight / svgViewBoxWidth) * ovalScreenWidth
            
            // Если SVG элемент существует, используем его реальные размеры
            if (ovalRef.current) {
              const rect = ovalRef.current.getBoundingClientRect()
              ovalScreenWidth = rect.width
              ovalScreenHeight = rect.height
            }

            // Масштаб для перевода координат SVG в координаты экрана
            const scaleX = ovalScreenWidth / svgViewBoxWidth
            const scaleY = ovalScreenHeight / svgViewBoxHeight

            // Центр овала на экране (центр SVG элемента)
            const ovalScreenX = screenWidth / 2
            const ovalScreenY = screenHeight / 2

            // Радиусы овала на экране (пересчитанные из SVG)
            const ovalRadiusX = svgOvalRadiusX * scaleX
            const ovalRadiusY = svgOvalRadiusY * scaleY

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
            const a = ovalRadiusX
            const b = ovalRadiusY

            // Проверяем точки лица с настраиваемым допуском
            const checkPoint = (x, y) => {
              const dx = (x - ovalScreenX) / a
              const dy = (y - ovalScreenY) / b
              return (dx * dx + dy * dy) <= faceDetectionConfig.pointTolerance
            }

            // Проверяем центр лица (главный критерий)
            const centerIn = checkPoint(faceCenterX, faceCenterY)

            // Проверяем углы лица (должно быть минимум 3 из 4 внутри)
            const topLeftIn = checkPoint(faceTopLeftScreenX, faceTopLeftScreenY)
            const topRightIn = checkPoint(faceBottomRightScreenX, faceTopLeftScreenY)
            const bottomLeftIn = checkPoint(faceTopLeftScreenX, faceBottomRightScreenY)
            const bottomRightIn = checkPoint(faceBottomRightScreenX, faceBottomRightScreenY)

            const cornersIn = [topLeftIn, topRightIn, bottomLeftIn, bottomRightIn].filter(Boolean).length
            const mostCornersIn = cornersIn >= faceDetectionConfig.minCornersInOval

            // Проверяем размер лица с настраиваемыми границами
            const ovalWidthForSize = ovalRadiusX * 2
            const ovalHeightForSize = ovalRadiusY * 2
            const faceSizeRatio = Math.max(faceWidth / ovalWidthForSize, faceHeight / ovalHeightForSize)
            const sizeValid = faceSizeRatio >= faceDetectionConfig.minFaceSize && 
                            faceSizeRatio <= faceDetectionConfig.maxFaceSize

            // Лицо считается в овале, если центр внутри И большинство углов внутри И размер подходящий
            const inOval = centerIn && mostCornersIn && sizeValid

            // Проверка стабильности: лицо должно быть в овале несколько кадров подряд
            if (inOval) {
              stabilityRef.current += 1
            } else {
              stabilityRef.current = 0
            }
            
            // Лицо считается стабильно в овале только после нескольких кадров
            const isStableInOval = stabilityRef.current >= faceDetectionConfig.stabilityFrames

            setIsFaceInOval(isStableInOval)

            // Обновляем текст инструкции в зависимости от состояния
            // Если идет сканирование, текст управляется через scanStage
            if (!scanProgress || scanProgress === 0) {
              if (isStableInOval) {
                setInstructionText('Отлично! Держите лицо неподвижно')
              } else if (inOval && !isStableInOval) {
                setInstructionText('Держите лицо неподвижно...')
              } else if (isFaceDetected) {
                setInstructionText('Поместите лицо в овал и не двигайтесь')
              } else {
                setInstructionText('Поместите лицо в овал')
              }
            }
          } else {
            setIsFaceDetected(false)
            setIsFaceInOval(false)
            stabilityRef.current = 0 // Сбрасываем счетчик стабильности
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

  // Определяем цвет овала: синий во время сканирования, зеленый когда готов, желтый когда не в овале
  const ovalColorClass = scanProgress > 0
    ? 'face-oval-scanning'
    : isFaceInOval
      ? 'face-oval-success'
      : isFaceDetected
        ? 'face-oval-warning'
        : 'face-oval-default'
  
  // Вычисляем длину дуги для прогресс-бара (в процентах от окружности)
  // Прогресс идет по часовой стрелке, начиная сверху
  // Формула Рамануджана для приблизительной длины эллипса: π * [3(a+b) - sqrt((3a+b)(a+3b))]
  const a = 143 // Радиус по X
  const b = 198.5 // Радиус по Y
  const circumference = Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)))
  
  // Создаем path для овала, начинающийся сверху и идущий по часовой стрелке
  // Начальная точка: (149, 6) - верхняя точка эллипса (cy - ry = 204.5 - 198.5 = 6)
  // Нижняя точка: (149, 403) - нижняя точка эллипса (cy + ry = 204.5 + 198.5 = 403)
  // Используем две дуги для полного обхода эллипса по часовой стрелке
  const ovalPath = `M 149 6 A ${a} ${b} 0 1 1 149 403 A ${a} ${b} 0 1 1 149 6`
  
  // Вычисляем offset для stroke-dasharray (начинаем сверху, идем по часовой стрелке)
  const progressOffset = circumference - (circumference * scanProgress) / 100

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
                ref={ovalRef}
                className={`face-oval ${ovalColorClass}`}
                width="298" 
                height="409" 
                viewBox="0 0 298 409" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <path
                    id="oval-path"
                    d="M 149 6 A 143 198.5 0 1 1 149 403 A 143 198.5 0 1 1 149 6"
                  />
                </defs>
                <mask id="mask0_138_3429" style={{maskType: 'alpha'}} maskUnits="userSpaceOnUse" x="0" y="0" width="298" height="409">
                  <ellipse cx="149" cy="204.5" rx="143" ry="198.5" stroke="black" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round"/>
                </mask>
                <g mask="url(#mask0_138_3429)">
                  <ellipse cx="149.5" cy="204.5" rx="154.5" ry="210.5" fill="#D3E8F4"/>
                </g>
                {/* Прогресс-бар по овалу - точно следует контуру овала */}
                {scanProgress > 0 && (
                  <path
                    d={ovalPath}
                    stroke="#07C3DC"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={progressOffset}
                    style={{
                      transition: 'stroke-dashoffset 0.1s linear',
                    }}
                  />
                )}
                {/* Основной контур овала */}
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
                  opacity={scanProgress > 0 ? 0.3 : 1}
                />
              </svg>
            </div>
            <div className="camera-instruction-container">
              {scanProgress > 0 ? (
                <>
                  <p className="camera-instruction-percent">{Math.round(scanProgress)}%</p>
                  <p className="camera-instruction-text">{scanStage}</p>
                </>
              ) : (
                <p className="camera-instruction-text">{instructionText}</p>
              )}
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

