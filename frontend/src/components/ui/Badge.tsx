import React from 'react'
import { type VariantProps } from 'class-variance-authority'
import { badgeVariants } from './badge-variants'
import { cn } from '../../utils/cn'

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge }