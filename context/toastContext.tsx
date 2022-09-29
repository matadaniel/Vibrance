import { createContext, useEffect, useState } from 'react'

type StatusType = 'pending' | 'success' | 'error'

interface ToastType {
  toasts: {
    id: number
    status: StatusType
    message: string
    closing?: boolean
  }[]
  createToast: (status: StatusType, message: string) => number
  modifyToast: (id: number, status: StatusType, message: string) => void
  closeToast: (id: number) => void
}

const defaultValue = {
  toasts: [],
  createToast: () => {
    throw new Error('ToastContext using defaultValue')
  },
  modifyToast: () => {
    throw new Error('ToastContext using defaultValue')
  },
  closeToast: () => {
    throw new Error('ToastContext using defaultValue')
  },
}

const ToastContext = createContext<ToastType>(defaultValue)

let toastCounter = 0

export const ToastProvider: React.FC = ({ children }) => {
  const [toasts, setToasts] = useState<ToastType['toasts']>([])

  useEffect(() => {
    toasts.forEach(toast => {
      if (
        (toast.status === 'success' && !toast.closing) ||
        (toast.status === 'error' && !toast.closing)
      ) {
        setToasts(prev =>
          prev.map(prevToast =>
            prevToast.id === toast.id ? { ...prevToast, closing: true } : prevToast
          )
        )
        setTimeout(() => closeToast(toast.id), 5000)
      }
    })
  }, [toasts])

  const createToast = (status: StatusType, message: string) => {
    const id = toastCounter++
    setToasts(prev => [...prev, { id, status, message }])
    return id
  }

  const modifyToast = (id: number, status: StatusType, message: string) => {
    setToasts(prev => prev.map(toast => (toast.id === id ? { id, status, message } : toast)))
  }

  const closeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toasts, createToast, modifyToast, closeToast }}>
      {children}
    </ToastContext.Provider>
  )
}

export default ToastContext
