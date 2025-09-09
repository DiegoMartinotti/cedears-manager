import { AnimatePresence, motion, type Transition } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import type { FC, ReactNode } from 'react'

interface PageTransitionProps {
  children: ReactNode
  className?: string
}

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98
  },
  in: {
    opacity: 1,
    y: 0,
    scale: 1
  },
  out: {
    opacity: 0,
    y: -20,
    scale: 1.02
  }
}

const pageTransition: Transition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.4
}

export const PageTransition: FC<PageTransitionProps> = ({
  children,
  className
}) => {
  const location = useLocation()
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

// Transición específica para modales
export const ModalTransition: FC<{
  children: ReactNode
  isOpen: boolean
}> = ({ children, isOpen }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25
            }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Transición para sidebar
export const SidebarTransition: FC<{
  children: ReactNode
  isCollapsed: boolean
}> = ({ children, isCollapsed }) => {
  return (
    <motion.div
      animate={{
        width: isCollapsed ? 64 : 240
      }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30
      }}
      className="overflow-hidden"
    >
      <motion.div
        animate={{
          opacity: isCollapsed ? 0 : 1
        }}
        transition={{
          delay: isCollapsed ? 0 : 0.2,
          duration: 0.2
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

// Transición para tabs
export const TabTransition: React.FC<{
  children: React.ReactNode
  tabId: string
  activeTab: string
}> = ({ children, tabId, activeTab }) => {
  return (
    <AnimatePresence mode="wait">
      {activeTab === tabId && (
        <motion.div
          key={tabId}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{
            duration: 0.3,
            ease: "easeOut"
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Loading transition
export const LoadingTransition: React.FC<{
  isLoading: boolean
  children: React.ReactNode
  fallback?: React.ReactNode
}> = ({ isLoading, children, fallback }) => {
  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {fallback}
        </motion.div>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Slide transition para carousels o steps
export const SlideTransition: React.FC<{
  children: React.ReactNode
  direction: 'left' | 'right'
  step: number
}> = ({ children, direction, step }) => {
  const variants = {
    enter: {
      x: direction === 'left' ? -300 : 300,
      opacity: 0
    },
    center: {
      x: 0,
      opacity: 1
    },
    exit: {
      x: direction === 'left' ? 300 : -300,
      opacity: 0
    }
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{
          x: { type: "spring", stiffness: 300, damping: 30 },
          opacity: { duration: 0.2 }
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}