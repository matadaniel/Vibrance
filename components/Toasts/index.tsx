import styles from './Toasts.module.scss'
import ToastContext from '../../context/toastContext'
import { useContext } from 'react'
import { IoCheckmarkCircleOutline, IoAlertCircleOutline } from 'react-icons/io5'

const Toasts: React.FC = () => {
  const toastCtx = useContext(ToastContext)
  const { toasts } = toastCtx

  const symbols = {
    error: <IoAlertCircleOutline size={30} />,
    pending: (
      <svg width="30" height="30" xmlns="http://www.w3.org/2000/svg">
        <path d="M 15 25 A 10 10 0 0 0 15 5" stroke="currentColor" strokeWidth={4} fill="none" />
      </svg>
    ),
    success: <IoCheckmarkCircleOutline size={30} />,
  }

  return (
    <div className={styles.container}>
      {toasts.map(toast => (
        <div key={toast.id} className={styles[toast.status]}>
          {symbols[toast.status]} {toast.message}
          {toast.closing && <div className={styles.bar} />}
        </div>
      ))}
    </div>
  )
}

export default Toasts
