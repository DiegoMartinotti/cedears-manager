import React from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { cn } from '../../utils/cn'

interface AnimatedListProps {
  children: React.ReactNode
  className?: string
  staggerDelay?: number
  layout?: boolean
  variant?: 'fade' | 'slide' | 'scale'
}

const listVariants = {
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  },
  slide: {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 }
  },
  scale: {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 }
  }
}

export const AnimatedList: React.FC<AnimatedListProps> = ({
  children,
  className,
  staggerDelay = 0.1,
  layout = true,
  variant: _variant = 'slide'
}) => {
  const content = layout ? (
    <LayoutGroup>
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
    </LayoutGroup>
  ) : (
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

  return content
}

// Item individual de la lista
export const AnimatedListItem: React.FC<{
  children: React.ReactNode
  className?: string
  variant?: 'fade' | 'slide' | 'scale'
  layout?: boolean
  layoutId?: string
}> = ({ 
  children, 
  className, 
  variant = 'slide', 
  layout = false,
  layoutId 
}) => {
  const motionProps = {
    variants: listVariants[variant],
    transition: {
      duration: 0.3,
      ease: "easeOut"
    },
    className: className,
    ...(layout && { layout: true }),
    ...(layoutId && { layoutId })
  }

  return (
    <motion.div {...motionProps}>
      {children}
    </motion.div>
  )
}

// Lista específica para instrumentos financieros
export const InstrumentList: React.FC<{
  instruments: Array<{ id: string; [key: string]: any }>
  renderItem: (item: any, index: number) => React.ReactNode
  className?: string
  emptyMessage?: string
}> = ({ instruments, renderItem, className, emptyMessage = "No hay instrumentos disponibles" }) => {
  return (
    <AnimatePresence mode="wait">
      {instruments.length === 0 ? (
        <motion.div
          key="empty"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex flex-col items-center justify-center py-12 text-center"
        >
          <div className="text-4xl mb-4">📊</div>
          <p className="text-muted-foreground">{emptyMessage}</p>
        </motion.div>
      ) : (
        <AnimatedList className={className} key="list">
          {instruments.map((instrument, index) => (
            <AnimatedListItem
              key={instrument.id}
              layoutId={instrument.id}
              layout
            >
              {renderItem(instrument, index)}
            </AnimatedListItem>
          ))}
        </AnimatedList>
      )}
    </AnimatePresence>
  )
}

// Lista de notificaciones con animación
export const NotificationList: React.FC<{
  notifications: Array<{ id: string; [key: string]: any }>
  renderItem: (item: any) => React.ReactNode
  className?: string
}> = ({ notifications, renderItem, className }) => {
  return (
    <AnimatePresence>
      <AnimatedList 
        className={cn("space-y-2", className)}
        staggerDelay={0.05}
        variant="slide"
      >
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            layout
            layoutId={notification.id}
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ 
              opacity: 0, 
              height: 0, 
              y: -10,
              transition: { duration: 0.2 }
            }}
            transition={{
              layout: { type: "spring", stiffness: 300, damping: 25 },
              opacity: { duration: 0.2 },
              height: { duration: 0.2 }
            }}
          >
            {renderItem(notification)}
          </motion.div>
        ))}
      </AnimatedList>
    </AnimatePresence>
  )
}

// Lista reordenable
export const ReorderableList: React.FC<{
  items: Array<{ id: string; [key: string]: any }>
  onReorder: (items: any[]) => void
  renderItem: (item: any, index: number) => React.ReactNode
  className?: string
}> = ({ items, onReorder: _onReorder, renderItem, className }) => {
  return (
    <motion.div className={className}>
      {items.map((item, index) => (
        <motion.div
          key={item.id}
          layoutId={item.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          whileDrag={{ 
            scale: 1.05, 
            rotate: 2,
            zIndex: 1000 
          }}
        >
          {renderItem(item, index)}
        </motion.div>
      ))}
    </motion.div>
  )
}

// Lista con scroll virtual animado
export const VirtualizedAnimatedList: React.FC<{
  items: any[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: any, index: number) => React.ReactNode
  className?: string
}> = ({ items, itemHeight, containerHeight, renderItem, className }) => {
  const [scrollY, setScrollY] = React.useState(0)
  
  const visibleItems = React.useMemo(() => {
    const startIndex = Math.floor(scrollY / itemHeight)
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      items.length
    )
    
    return items.slice(startIndex, endIndex).map((item, i) => ({
      ...item,
      index: startIndex + i
    }))
  }, [items, scrollY, itemHeight, containerHeight])

  return (
    <div
      className={cn("overflow-auto", className)}
      style={{ height: containerHeight }}
      onScroll={(e) => setScrollY(e.currentTarget.scrollTop)}
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        <AnimatePresence>
          {visibleItems.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'absolute',
                top: item.index * itemHeight,
                width: '100%',
                height: itemHeight
              }}
            >
              {renderItem(item, item.index)}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}