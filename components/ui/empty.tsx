"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface EmptyProps extends React.HTMLAttributes<HTMLDivElement> {}

function Empty({ className, ...props }: EmptyProps) {
  return (
    <div
      className={cn(
        "flex min-h-[400px] flex-col items-center justify-center gap-8 rounded-lg border border-dashed p-8 text-center",
        className
      )}
      {...props}
    />
  )
}

interface EmptyHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

function EmptyHeader({ className, ...props }: EmptyHeaderProps) {
  return (
    <div
      className={cn("flex flex-col items-center gap-4", className)}
      {...props}
    />
  )
}

interface EmptyMediaProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "icon" | "illustration"
}

function EmptyMedia({ className, variant = "icon", ...props }: EmptyMediaProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full",
        variant === "icon" && "h-16 w-16 bg-muted text-muted-foreground",
        variant === "illustration" && "h-32 w-32",
        "[&>svg]:h-8 [&>svg]:w-8",
        className
      )}
      {...props}
    />
  )
}

interface EmptyTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

function EmptyTitle({ className, ...props }: EmptyTitleProps) {
  return (
    <h3
      className={cn("text-lg font-semibold", className)}
      {...props}
    />
  )
}

interface EmptyDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

function EmptyDescription({ className, ...props }: EmptyDescriptionProps) {
  return (
    <p
      className={cn("text-sm text-muted-foreground max-w-sm", className)}
      {...props}
    />
  )
}

interface EmptyContentProps extends React.HTMLAttributes<HTMLDivElement> {}

function EmptyContent({ className, ...props }: EmptyContentProps) {
  return (
    <div
      className={cn("flex flex-col items-center gap-2", className)}
      {...props}
    />
  )
}

export {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
}

