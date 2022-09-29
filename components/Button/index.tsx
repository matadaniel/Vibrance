import styles from './Button.module.scss'
import { MouseEventHandler } from 'react'

interface ButtonProps {
  disabled?: boolean
  onClick?: MouseEventHandler<HTMLButtonElement>
}

const Button: React.FC<ButtonProps> = ({ disabled, onClick, children }) => {
  return (
    <button className={styles.button} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  )
}

export default Button
