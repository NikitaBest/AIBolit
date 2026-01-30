import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import PrimaryButton from '../components/PrimaryButton.jsx'
import Page from '../layout/Page.jsx'
import './Welcome.css'

function Welcome() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [isRequestingCamera, setIsRequestingCamera] = useState(false)
  const [cameraError, setCameraError] = useState('')

  const isFirstStep = step === 0
  const isSecondStep = step === 1

  const requestCameraAccess = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Ваше устройство не поддерживает доступ к камере.')
      return
    }

    setIsRequestingCamera(true)
    setCameraError('')
    let stream = null

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })

      // Доступ получен, останавливаем поток и переходим на страницу выбора приоритета
      stream.getTracks().forEach((track) => track.stop())
      navigate('/priority')
    } catch (err) {
      // Обработка различных типов ошибок
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Доступ к камере отклонен. Пожалуйста, разрешите доступ в настройках браузера.')
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('Камера не найдена на вашем устройстве.')
      } else {
        setCameraError('Не удалось получить доступ к камере. Проверьте разрешения.')
      }
      console.error('Camera access error:', err)
    } finally {
      setIsRequestingCamera(false)
      // Гарантируем остановку потока в случае ошибки
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }

  return (
    <Page className="home-page">
      <div className="welcome-content">
        <img
          src={
            step === 0
              ? '/Welcome1.svg'
              : step === 1
                ? '/Welcome2.svg'
                : '/Welcome3.svg'
          }
          alt={
            step === 0
              ? 'Иконка лица'
              : step === 1
                ? 'Иконка щита'
                : 'Иконка камеры'
          }
          className="welcome-icon"
        />
        {step === 0 && (
          <>
            <p className="welcome-heading">Ваше лицо — зеркало здоровья</p>
            <p className="text-secondary">
              Мгновенный анализ пульса, уровня стресса и рисков. Просто посмотрите в камеру.
            </p>
          </>
        )}
        {step === 1 && (
          <>
            <p className="welcome-heading">Ваша приватность — наш приоритет</p>
            <p className="text-secondary">
              Мы не собираем биометрические данные и не распознаем лица. Видеопоток анализируется
              локально и мгновенно удаляется после завершения.
            </p>
          </>
        )}
        {step === 2 && (
          <>
            <p className="welcome-heading">Нужен доступ к камере</p>
            <p className="text-secondary">
              Мы не записываем и не сохраняем видео. Камера нужна только для измерения пульса по
              изменению цвета лица.
            </p>
            {cameraError && (
              <p className="error-text" style={{ marginTop: '8px' }}>
                {cameraError}
              </p>
            )}
          </>
        )}
      </div>
      <div className="welcome-footer">
        <div className="welcome-dots">
          <span className={`dot ${step === 0 ? 'dot-active' : ''}`} />
          <span className={`dot ${step === 1 ? 'dot-active' : ''}`} />
          <span className={`dot ${step === 2 ? 'dot-active' : ''}`} />
        </div>
        <PrimaryButton
          onClick={() => {
            if (step === 0) setStep(1)
            else if (step === 1) setStep(2)
            else requestCameraAccess()
          }}
          disabled={isRequestingCamera}
        >
          {isRequestingCamera
            ? 'Запрос доступа...'
            : step === 0
              ? 'Далее'
              : step === 1
                ? 'Начать'
                : 'Разрешить доступ'}
        </PrimaryButton>
        {step < 2 ? (
          <p className="legal-text">
            Нажимая «Начать», вы соглашаетесь с Политикой конфиденциальности и Условиями
            использования
          </p>
        ) : (
          <p className="legal-text">Обработка происходит на вашем устройстве</p>
        )}
      </div>
    </Page>
  )
}

export default Welcome


