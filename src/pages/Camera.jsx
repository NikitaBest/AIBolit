import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Page from '../layout/Page.jsx'
import './Camera.css'

function Camera() {
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const handleCancel = () => {
    navigate(-1)
  }

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
        }
      } catch (err) {
        setError('Не удалось получить доступ к камере. Проверьте разрешения.')
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    initCamera()

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
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
              <img src="/FaceOval.svg" alt="Face oval guide" className="face-oval" />
            </div>
            <div className="camera-instruction-container">
              <p className="camera-instruction-text">
                Поместите лицо в овал и не двигайтесь
              </p>
            </div>
            <button className="camera-cancel-button" onClick={handleCancel} type="button">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Отменить анализ</span>
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default Camera

