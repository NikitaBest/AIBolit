import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import PrimaryButton from '../components/PrimaryButton.jsx'
import Page from '../layout/Page.jsx'
import './Welcome.css'

function Welcome() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)

  const isFirstStep = step === 0
  const isSecondStep = step === 1

  return (
    <Page className="home-page">
      <div className="welcome-content">
        <img
          src={
            step === 0
              ? '/Welcome1.png'
              : step === 1
                ? '/Welcome2.png'
                : '/Welcome3.png'
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
            else navigate('/camera')
          }}
        >
          {step === 0 ? 'Далее' : step === 1 ? 'Начать' : 'Разрешить доступ'}
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


