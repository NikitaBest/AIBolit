import './ResultCard.css'

/**
 * Карточка одного показателя: вверху слева круг с иконкой, справа наименование 16px, ниже цифры.
 */
function ResultCard({ label, value, unit, confidence, icon, className = '' }) {
  return (
    <div className={`result-card-block ${className}`.trim()}>
      <div className="result-card-block__header">
        {icon && (
          <div className="result-card-block__icon-wrap">
            <img src={icon} alt="" className="result-card-block__icon" />
          </div>
        )}
        {label && <div className="result-card-block__label">{label}</div>}
      </div>
      <div className="result-card-block__value">{value ?? '—'}</div>
      {unit && <div className="result-card-block__unit">{unit}</div>}
      {confidence != null && (
        <div className="result-card-block__confidence">
          Уверенность: {typeof confidence === 'number' ? Math.round(confidence * 100) : confidence}%
        </div>
      )}
    </div>
  )
}

export default ResultCard
