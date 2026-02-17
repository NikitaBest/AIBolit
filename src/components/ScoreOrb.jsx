import './ScoreOrb.css'

/**
 * Шар с основным счётом и текстом — заменяет заголовок на странице результатов.
 * Пропсы: score (число), maxScore (по умолчанию 10), message, label.
 */
function ScoreOrb({ score, maxScore = 10, message, label, className = '' }) {
  const displayScore = score != null && score !== '' ? Number(score) : null
  const max = maxScore != null ? Number(maxScore) : 10

  return (
    <div className={`score-orb ${className}`.trim()} aria-hidden>
      <div className="score-orb__gradient-blur" aria-hidden />
      <div className="score-orb__glow">
        <div className="score-orb__content">
          {displayScore !== null && !Number.isNaN(displayScore) && (
            <div className="score-orb__score-wrap">
              <span className="score-orb__score">{displayScore}</span>
              <span className="score-orb__score-max">/{max}</span>
            </div>
          )}
          {message && <p className="score-orb__message">{message}</p>}
          {label && (
            <span className="score-orb__label">{label}</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default ScoreOrb
