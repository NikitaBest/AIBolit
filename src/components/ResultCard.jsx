import './ResultCard.css'

/**
 * Карточка одного показателя. Опционально: backgroundColor, backgroundVector (SVG за текстом).
 */
function ResultCard({ label, value, unit, confidence, icon, backgroundColor, backgroundVector, className = '' }) {
  return (
    <div
      className={`result-card-block ${className}`.trim()}
      style={backgroundColor ? { backgroundColor } : undefined}
    >
      {backgroundVector && (
        <>
          <div className="result-card-block__bg-vector" aria-hidden>
            <img
              src={backgroundVector}
              alt=""
              className="result-card-block__bg-vector-img"
            />
          </div>
          <div className="result-card-block__blur-bottom" aria-hidden />
        </>
      )}
      <div className="result-card-block__content">
        <div className="result-card-block__header">
          {icon && (
            <div className="result-card-block__icon-wrap">
              <img src={icon} alt="" className="result-card-block__icon" />
            </div>
          )}
          {label && <div className="result-card-block__label">{label}</div>}
        </div>
        <div className="result-card-block__value-row">
          <span className="result-card-block__value">{value ?? '—'}</span>
          {unit && <span className="result-card-block__unit">{unit}</span>}
        </div>
        {confidence != null && (
          <div className="result-card-block__confidence">
            Уверенность: {typeof confidence === 'number' ? Math.round(confidence * 100) : confidence}%
          </div>
        )}
      </div>
    </div>
  )
}

export default ResultCard
