"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => {
  const normalizedValue = Math.max(0, Math.min(100, value || 0))
  const isComplete = normalizedValue >= 100
  const dataState = isComplete ? "complete" : "loading"
  
  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
        className
      )}
      data-state={dataState}
      data-value={normalizedValue}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full flex-1 bg-primary transition-all"
        style={{ 
          transform: normalizedValue >= 100 
            ? `translateX(0%)` 
            : `translateX(-${100 - normalizedValue}%)` 
        }}
        data-state={dataState}
      />
    </ProgressPrimitive.Root>
  )
})
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
