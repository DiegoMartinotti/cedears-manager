import React from 'react'
import { Button } from './Button'

interface AlertDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title: string
  description: string
  onConfirm: () => void
  onCancel?: () => void
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  open = false,
  onOpenChange,
  title,
  description,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default'
}) => {
  if (!open) return null

  const handleCancel = () => {
    onCancel?.()
    onOpenChange?.(false)
  }

  const handleConfirm = () => {
    onConfirm()
    onOpenChange?.(false)
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCancel()
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            {title}
          </h2>
          <p className="text-sm text-gray-600">
            {description}
          </p>
        </div>
        
        <div className="flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={handleCancel}
          >
            {cancelText}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={handleConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default AlertDialog