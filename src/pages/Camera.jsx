import { useEffect, useRef, useState } from 'react'
import Page from '../layout/Page.jsx'
import './Camera.css'

function Camera() {
  const videoRef = useRef(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

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
    <Page className="camera-page" title="Camera">
      <div className="camera-preview">
        {isLoading && <p>Запрашиваем доступ к камере...</p>}
        {error && <p className="error-text">{error}</p>}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`camera-video ${error ? 'hidden' : ''}`}
        />
      </div>
    </Page>
  )
}

export default Camera

