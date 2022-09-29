import styles from './Input.module.scss'
import { ChangeEventHandler } from 'react'

interface InputProps {
  error?: string
  pattern?: string
  value?: string
  onChange?: ChangeEventHandler<HTMLInputElement>
  placeholder?: string
  title?: string
}

const Input: React.FC<InputProps> = ({ error, pattern, value, onChange, placeholder, title }) => {
  return (
    <div className={styles.container}>
      <div className={styles.input}>
        {error && <span className={styles.error}>{error}</span>}
        <input
          required
          pattern={pattern}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          title={title ?? placeholder}
        />
      </div>
    </div>
  )
}

export default Input
