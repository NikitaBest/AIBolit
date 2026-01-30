import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Page from '../layout/Page.jsx'
import Header from '../layout/Header.jsx'
import RadioCard from '../ui/RadioCard.jsx'
import DateInput from '../ui/DateInput.jsx'
import PrimaryButton from '../components/PrimaryButton.jsx'
import './AlgorithmSettings.css'

const GENDER_OPTIONS = [
  {
    value: 'male',
    label: 'Мужской',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 6C13.1046 6 14 5.10457 14 4C14 2.89543 13.1046 2 12 2C10.8954 2 10 2.89543 10 4C10 5.10457 10.8954 6 12 6Z" fill="currentColor"/>
        <path d="M15 7H9C8.73478 7 8.48043 7.10536 8.29289 7.29289C8.10536 7.48043 8 7.73478 8 8V15H10V22H14V15H16V8C16 7.73478 15.8946 7.48043 15.7071 7.29289C15.5196 7.10536 15.2652 7 15 7Z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    value: 'female',
    label: 'Женский',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 6C13.1046 6 14 5.10457 14 4C14 2.89543 13.1046 2 12 2C10.8954 2 10 2.89543 10 4C10 5.10457 10.8954 6 12 6Z" fill="currentColor"/>
        <path d="M14.948 7.684C14.8817 7.48496 14.7545 7.3118 14.5844 7.18905C14.4142 7.0663 14.2098 7.00016 14 7H10C9.79021 7.00016 9.58578 7.0663 9.41565 7.18905C9.24551 7.3118 9.1183 7.48496 9.052 7.684L7.052 13.684L8.827 14.277L8 18H10V22H14V18H16L15.173 14.276L16.948 13.683L14.948 7.684Z" fill="currentColor"/>
      </svg>
    ),
  },
]

function AlgorithmSettings() {
  const navigate = useNavigate()
  const [gender, setGender] = useState('male')
  const [birthDate, setBirthDate] = useState('')
  const [dateError, setDateError] = useState('')

  // Валидация даты
  const validateDate = (dateString) => {
    if (!dateString || dateString.length !== 10) {
      return { isValid: false, error: '' }
    }

    const parts = dateString.split('.')
    if (parts.length !== 3) {
      return { isValid: false, error: 'Неверный формат даты' }
    }

    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10)
    const year = parseInt(parts[2], 10)

    // Проверка диапазонов
    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > new Date().getFullYear()) {
      return { isValid: false, error: 'Неверная дата' }
    }

    // Проверка корректности даты
    const date = new Date(year, month - 1, day)
    if (
      date.getDate() !== day ||
      date.getMonth() !== month - 1 ||
      date.getFullYear() !== year
    ) {
      return { isValid: false, error: 'Неверная дата' }
    }

    // Проверка что дата не в будущем
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (date > today) {
      return { isValid: false, error: 'Дата не может быть в будущем' }
    }

    // Проверка разумного возраста (например, не старше 150 лет)
    const age = today.getFullYear() - year
    if (age > 150) {
      return { isValid: false, error: 'Неверная дата рождения' }
    }

    return { isValid: true, error: '' }
  }

  // Расчет возраста
  const calculateAge = (dateString) => {
    if (!dateString || dateString.length !== 10) return null

    const parts = dateString.split('.')
    if (parts.length !== 3) return null

    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10)
    const year = parseInt(parts[2], 10)

    const birthDate = new Date(year, month - 1, day)
    const today = new Date()

    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }

    return age
  }

  // Функция для правильного склонения слова "год"
  const getAgeWord = (age) => {
    const lastDigit = age % 10
    const lastTwoDigits = age % 100

    // Исключение для 11, 12, 13, 14
    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
      return 'лет'
    }

    // 1, 21, 31, 41... → "год"
    if (lastDigit === 1) {
      return 'год'
    }

    // 2, 3, 4, 22, 23, 24, 32, 33, 34... → "года"
    if (lastDigit >= 2 && lastDigit <= 4) {
      return 'года'
    }

    // 5, 6, 7, 8, 9, 10, 15, 16, 17, 18, 19, 20, 25... → "лет"
    return 'лет'
  }

  const handleDateChange = (value) => {
    setBirthDate(value)
    if (value.length === 10) {
      const validation = validateDate(value)
      setDateError(validation.error)
    } else {
      setDateError('')
    }
  }

  // Используем useMemo для оптимизации валидации
  const dateValidation = useMemo(() => {
    if (birthDate.length !== 10) {
      return { isValid: false, age: null }
    }
    const validation = validateDate(birthDate)
    if (validation.isValid) {
      const age = calculateAge(birthDate)
      return { isValid: true, age }
    }
    return { isValid: false, age: null }
  }, [birthDate])

  const isValidDate = dateValidation.isValid && !dateError
  const age = dateValidation.age
  const isFormValid = gender && isValidDate

  const handleNext = () => {
    if (isFormValid) {
      // Здесь можно сохранить данные и перейти на следующую страницу
      navigate('/camera')
    }
  }

  return (
    <Page className="algorithm-settings-page">
      <Header title="Настройка алгоритмов" />
      
      <div className="algorithm-settings-content">
        {/* Секция выбора пола */}
        <div className="settings-section">
          <h2 className="settings-section-title">Ваш пол</h2>
          <p className="settings-section-subtitle">
            Влияет на нормы артериального давления и риск ИБС
          </p>
          
          <div className="gender-options">
            {GENDER_OPTIONS.map((option) => (
              <RadioCard
                key={option.value}
                icon={option.icon}
                label={option.label}
                value={option.value}
                selected={gender === option.value}
                onClick={setGender}
              />
            ))}
          </div>

          {gender && (
            <div className="settings-note">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.3333 4L6 11.3333L2.66667 8" stroke="#07c3dc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
              <span>Учтено в базовых параметрах</span>
            </div>
          )}
        </div>

        {/* Секция даты рождения */}
        <div className="settings-section">
          <h2 className="settings-section-title">Дата рождения</h2>
          <p className="settings-section-subtitle">
            Для расчёта возрастных рисков
          </p>
          
          <DateInput
            value={birthDate}
            onChange={handleDateChange}
            placeholder="ДД.ММ.ГГГГ"
          />
          {dateError && (
            <p className="date-error-text">{dateError}</p>
          )}
          {isValidDate && age !== null && (
            <div className="settings-note">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.3333 4L6 11.3333L2.66667 8" stroke="#07c3dc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
              <span>
                Возраст: {age} {getAgeWord(age)}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="algorithm-settings-footer">
        <PrimaryButton onClick={handleNext} disabled={!isFormValid}>
          Далее
        </PrimaryButton>
        <p className="algorithm-settings-hint">
          Вы сможете изменить параметры в любой момент
        </p>
      </div>
    </Page>
  )
}

export default AlgorithmSettings

