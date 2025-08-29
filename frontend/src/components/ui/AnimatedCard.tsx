import React from 'react'
import { motion, AnimatePresence, HTMLMotionProps } from 'framer-motion'
import { cn } from '../../utils/cn'

interface AnimatedCardProps extends Omit<HTMLMotionProps<"div">, 'children'> {
  children: React.ReactNode
  className?: string
  hover?: boolean
  delay?: number
  stagger?: boolean
  staggerDelay?: number
  variant?: 'fade' | 'slide' | 'scale' | 'bounce'
}

const cardVariants = {
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  },
  slide: {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  },
  scale: {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 }
  },
  bounce: {
    hidden: { opacity: 0, scale: 0.3 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: {
        type: "spring",
        damping: 10,
        stiffness: 100
      }
    }
  }
}

const hoverVariants = {
  hover: { 
    scale: 1.02,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20
    }
  },
  tap: { 
    scale: 0.98 
  }
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  className,
  hover = false,
  delay = 0,
  variant = 'fade',
  ...props
}) => {
  const motionProps = {
    initial: "hidden",
    animate: "visible",
    variants: cardVariants[variant],
    transition: {
      duration: 0.4,
      delay,
      ease: "easeOut"
    },
    ...(hover && {
      whileHover: "hover",
      whileTap: "tap",
      variants: {
        ...cardVariants[variant],
        ...hoverVariants
      }
    }),
    ...props
  }

  return (
    <motion.div
      className={cn(
        "bg-card border border-border rounded-lg shadow-sm",
        hover && "cursor-pointer",
        className
      )}
      {...motionProps}
    >
      {children}
    </motion.div>
  )
}

// Card específica para instrumentos financieros
export const InstrumentCard: React.FC<{
  children: React.ReactNode
  className?: string
  delay?: number
  isSelected?: boolean
}> = ({ children, className, delay = 0, isSelected = false }) => {
  return (
    <AnimatedCard
      variant="slide"
      hover
      delay={delay}
      className={cn(
        "p-4 transition-colors duration-200",
        isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        className
      )}
      whileHover={{ 
        scale: 1.02,
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
      }}
    >
      {children}
    </AnimatedCard>
  )
}

// Card para métricas con animación de valor
export const MetricCard: React.FC<{
  title: string
  value: string | number
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  className?: string
  delay?: number
}> = ({ title, value, change, changeType = 'neutral', className, delay = 0 }) => {
  const changeColors = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-muted-foreground'
  }

  return (
    <AnimatedCard
      variant="scale"
      delay={delay}
      className={cn("p-6", className)}
    >
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{title}</p>
        
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: delay + 0.2, duration: 0.3 }}
          className="text-2xl font-bold text-foreground"
        >
          {value}
        </motion.div>
        
        {change && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: delay + 0.4, duration: 0.3 }}
            className={cn("text-sm", changeColors[changeType])}
          >
            {change}
          </motion.p>
        )}
      </div>
    </AnimatedCard>
  )
}

// Container para múltiples cards con animación staggered
export const StaggeredCardContainer: React.FC<{
  children: React.ReactNode
  className?: string
  staggerDelay?: number
}> = ({ children, className, staggerDelay = 0.1 }) => {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerDelay
          }
        }
      }}
    >
      {children}
    </motion.div>
  )
}

// Card flotante para notificaciones o alerts
export const FloatingCard: React.FC<{
  children: React.ReactNode
  isVisible: boolean
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  className?: string
}> = ({ 
  children, 
  isVisible, 
  position = 'top-right',
  className 
}) => {
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -20 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 25
          }}
          className={cn(
            "fixed z-50 bg-card border border-border rounded-lg shadow-lg",
            positionClasses[position],
            className
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}