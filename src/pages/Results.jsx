import { useLocation, useNavigate } from 'react-router-dom'
import Page from '../layout/Page.jsx'
import ResultCard from '../components/ResultCard.jsx'
import ScoreOrb from '../components/ScoreOrb.jsx'
import logger from '../utils/logger.js'
import './Results.css'

/** Считает основной балл и подписи для шара из уровня стресса (0–10: меньше = лучше). */
function getScoreOrbFromStress(stressValue) {
  if (stressValue == null || Number.isNaN(Number(stressValue))) {
    return { score: null, message: 'Результаты измерения', label: null }
  }
  const s = Math.min(10, Math.max(0, Number(stressValue)))
  const score = Math.round((10 - s) * 10) / 10
  if (score >= 8) return { score, message: 'Отличный результат!', label: 'У вас наилучший результат' }
  if (score >= 6) return { score, message: 'Хороший результат', label: 'Показатели в норме' }
  if (score >= 4) return { score, message: 'Умеренный уровень', label: 'Рекомендуется отдых' }
  return { score, message: 'Повышенный уровень', label: 'Обратите внимание' }
}

/** Порядок ключей для отображения (сначала основные, затем остальные по алфавиту). */
const PREFERRED_METRIC_ORDER = [
  'pulseRate',
  'respirationRate',
  'stressLevel',
  'bloodPressure',
  'sdnn',
  'prq',
  'wellnessLevel',
  'wellnessIndex',
  'hemoglobin',
  'hemoglobinA1c',
  'highHemoglobinA1CRisk',
]

/** Конфиг метрик SDK: подпись, единицы, иконка, опциональный фон. */
const METRIC_CONFIG = {
  pulseRate: { label: 'Пульс', unit: 'уд/мин', icon: '/Default.png', backgroundColor: '#E6FAFB', backgroundVector: '/Vector%201.svg' },
  respirationRate: { label: 'Частота дыхания', unit: 'дых/мин', icon: '/BreathRate.png' },
  stressLevel: { label: 'Уровень стресса', unit: 'из 10', icon: '/Stress.png' },
  bloodPressure: { label: 'Артериальное давление', unit: 'мм рт. ст.', icon: '/Pressure.png' },
  sdnn: { label: 'SDNN', unit: 'мс' },
  prq: { label: 'PRQ', unit: '' },
  wellnessLevel: { label: 'Уровень благополучия', unit: '' },
  wellnessIndex: { label: 'Индекс благополучия', unit: '' },
  hemoglobin: { label: 'Гемоглобин', unit: 'г/дл' },
  hemoglobinA1c: { label: 'Гемоглобин A1c', unit: '%' },
  highHemoglobinA1CRisk: { label: 'Риск высокого HbA1c', unit: '' },
}

/** Форматирует ключ camelCase в читаемую подпись. */
function formatMetricLabel(key) {
  const label = METRIC_CONFIG[key]?.label
  if (label) return label
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim()
}

/** Извлекает значение и уверенность из сырого значения SDK. */
function extractMetricDisplay(raw) {
  if (raw === null || raw === undefined) return { displayValue: null, confidence: undefined }
  let displayValue = raw
  let confidence = raw?.confidence ?? raw?.confidenceLevel

  if (typeof raw === 'object') {
    if ('value' in raw && typeof raw.value === 'object' && raw.value !== null) {
      const v = raw.value
      if ('systolic' in v && 'diastolic' in v) {
        const s = typeof v.systolic === 'object' && v.systolic && 'value' in v.systolic ? v.systolic.value : v.systolic
        const d = typeof v.diastolic === 'object' && v.diastolic && 'value' in v.diastolic ? v.diastolic.value : v.diastolic
        displayValue = `${s}/${d}`
      } else {
        displayValue = raw.value
      }
    } else if ('value' in raw) {
      displayValue = raw.value
    } else if ('systolic' in raw || 'diastolic' in raw) {
      const s = typeof raw.systolic === 'object' && raw.systolic && 'value' in raw.systolic ? raw.systolic.value : raw.systolic
      const d = typeof raw.diastolic === 'object' && raw.diastolic && 'value' in raw.diastolic ? raw.diastolic.value : raw.diastolic
      displayValue = `${s}/${d}`
    } else {
      displayValue = typeof raw.value !== 'undefined' ? raw.value : raw
    }
  }

  if (displayValue !== null && typeof displayValue === 'object' && typeof displayValue.toString === 'function' && displayValue.toString() === '[object Object]') {
    displayValue = null
  }
  return { displayValue, confidence }
}

function Results() {
  const location = useLocation()
  const navigate = useNavigate()
  const results = location.state?.results

  // Пользователь Telegram (аватар и имя для приветствия)
  const tgUser =
    typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.user
  const userName =
    tgUser?.first_name || tgUser?.username || 'Пользователь'
  const userPhotoUrl = tgUser?.photo_url

  if (!results || !results.results) {
    logger.warn('Results page accessed without results data')
    return (
      <Page>
        <div className="results-page">
          <div className="results-error">
            <h2>Результаты не найдены</h2>
            <p>Пожалуйста, пройдите измерение заново.</p>
            <button onClick={() => navigate('/camera')} className="results-button">
              Вернуться к измерению
            </button>
          </div>
        </div>
      </Page>
    )
  }

  // Для шара с баллом используем уровень стресса
  const stressLevelValue = extractMetricDisplay(results.results?.stressLevel).displayValue

  // Формируем карточки для всех показателей SDK
  const cardMetrics = Object.entries(results.results || {})
    .map(([key, raw]) => {
      const { displayValue, confidence } = extractMetricDisplay(raw)
      const hasValue = displayValue !== null && displayValue !== undefined && String(displayValue) !== '[object Object]'
      if (!hasValue) return null

      const config = METRIC_CONFIG[key] || {}
      return {
        key,
        label: formatMetricLabel(key),
        unit: config.unit ?? '',
        icon: config.icon,
        backgroundColor: config.backgroundColor,
        backgroundVector: config.backgroundVector,
        value: displayValue,
        confidence,
      }
    })
    .filter(Boolean)

  // Сортируем: сначала в порядке PREFERRED_METRIC_ORDER, остальные по алфавиту
  cardMetrics.sort((a, b) => {
    const i = PREFERRED_METRIC_ORDER.indexOf(a.key)
    const j = PREFERRED_METRIC_ORDER.indexOf(b.key)
    if (i !== -1 && j !== -1) return i - j
    if (i !== -1) return -1
    if (j !== -1) return 1
    return a.key.localeCompare(b.key)
  })

  logger.info('Results page displayed', { cardsCount: cardMetrics.length, stressLevelValue })

  const hasAnyResults = cardMetrics.length > 0
  const orbData = getScoreOrbFromStress(stressLevelValue)

  return (
    <Page>
      <div className="results-page">
        <div className="results-greeting">
          <div className="results-greeting-avatar-wrap">
            {userPhotoUrl ? (
              <img
                src={userPhotoUrl}
                alt=""
                className="results-greeting-avatar"
              />
            ) : (
              <span className="results-greeting-avatar-placeholder" aria-hidden>
                {userName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <p className="results-greeting-text">Привет, {userName}!</p>
        </div>
        <ScoreOrb
          score={orbData.score}
          maxScore={10}
          message={orbData.message}
          label={orbData.label}
        />

        {!hasAnyResults && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-fg-error)' }}>
            Нет данных для отображения. Пройдите измерение заново.
          </div>
        )}

        <div className="results-grid">
          {cardMetrics.map((metric) => (
            <ResultCard
              key={metric.key}
              icon={metric.icon}
              label={metric.label}
              value={metric.value}
              unit={metric.unit || undefined}
              confidence={metric.confidence}
              backgroundColor={metric.backgroundColor}
              backgroundVector={metric.backgroundVector}
            />
          ))}
        </div>

        <div className="results-actions">
          <button onClick={() => navigate('/camera')} className="results-button">
            Измерить снова
          </button>
          <button onClick={() => navigate('/')} className="results-button secondary">
            На главную
          </button>
        </div>
      </div>
    </Page>
  )
}

export default Results

