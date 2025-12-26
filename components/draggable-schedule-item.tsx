"use client"

import React, { useRef, useEffect } from "react"
import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MessageSquare, GripVertical, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"

interface DraggableScheduleItemProps {
  item: any
  position: { top: string; height: string }
  widthPercent: number
  leftPercent: number
  onClick: () => void
  onEdit: () => void
  formatMilitaryTime: (time: number) => string
  getDuration: (timeIn: number, timeOut: number) => string
  getColorForType: (item: any) => string
  isResizing?: boolean
  isDragging?: boolean
  editMode?: boolean
  isAdmin?: boolean
}

export function DraggableScheduleItem({
  item,
  position,
  widthPercent,
  leftPercent,
  onClick,
  onEdit,
  formatMilitaryTime,
  getDuration,
  getColorForType,
  isResizing = false,
  isDragging = false,
  editMode = false,
  isAdmin = false,
}: DraggableScheduleItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isCurrentlyDragging,
  } = useDraggable({
    id: `item-${item.id}`,
    data: {
      item,
      type: "move",
    },
  })

  // Track if drag happened to prevent click from firing after drag
  const wasDraggingRef = useRef(false)
  
  useEffect(() => {
    if (isCurrentlyDragging) {
      wasDraggingRef.current = true
    }
  }, [isCurrentlyDragging])

  const handleClick = (e: React.MouseEvent) => {
    // Prevent click if we just finished dragging
    if (wasDraggingRef.current) {
      wasDraggingRef.current = false
      return
    }
    // In edit mode, don't open details modal (clicking just selects for editing)
    if (editMode) {
      return
    }
    onClick()
  }

  // Only animate position changes when not actively dragging or resizing
  const shouldAnimate = !isCurrentlyDragging && !isResizing

  const style: React.CSSProperties = {
    top: position.top,
    height: position.height,
    left: `${leftPercent}%`,
    width: `${widthPercent}%`,
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    zIndex: isCurrentlyDragging || isResizing ? 1000 : undefined,
    // Animate position/size changes with movement, not fade
    transition: shouldAnimate 
      ? "top 300ms ease-out, height 300ms ease-out, left 300ms ease-out, width 300ms ease-out, box-shadow 150ms ease" 
      : "box-shadow 150ms ease",
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "absolute mx-2 md:mx-4 rounded-2xl border-2 p-3 bg-white overflow-hidden group",
        isCurrentlyDragging 
          ? "border-blue-400 shadow-2xl cursor-grabbing" 
          : "border-gray-100 hover:shadow-lg cursor-pointer"
      )}
      style={style}
      onClick={handleClick}
    >
      {/* Drag handle - positioned on right side (only in edit mode) */}
      {editMode && (
        <div 
          className="absolute top-0 bottom-0 right-0 w-12 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing z-30 bg-gradient-to-l from-gray-50 to-transparent opacity-0 group-hover:opacity-100 transition-all"
          {...listeners}
          {...attributes}
        >
          <GripVertical className="h-5 w-5 text-gray-400" />
        </div>
      )}

      {/* Edit button and duration - top right, inline */}
      <div className="absolute top-2 right-2 flex items-center gap-1.5">
        {/* Edit button - visible for admins (always), not just in edit mode */}
        {isAdmin && (
          <button
            className="bg-white rounded-full h-6 w-6 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer flex items-center justify-center z-50 relative opacity-0 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
          >
            <Pencil className="h-3 w-3 text-gray-500" />
          </button>
        )}
        {/* Duration - under gradient */}
        <span className="text-xs text-gray-500 font-medium z-20 relative">
          {getDuration(item.time_in, item.time_out)}
        </span>
      </div>

      {/* Top resize handle (only in edit mode) - larger for easier clicking */}
      {editMode && (
        <div 
          className="absolute top-0 left-0 right-0 h-4 cursor-ns-resize z-40 hover:bg-gray-200/50 transition-colors"
          onMouseDown={(e) => {
            e.stopPropagation()
            const event = new CustomEvent('schedule-resize-start', {
              detail: { itemId: item.id, edge: 'top', startY: e.clientY, item }
            })
            window.dispatchEvent(event)
          }}
        />
      )}

      {/* Bottom resize handle (only in edit mode) - larger for easier clicking */}
      {editMode && (
        <div 
          className="absolute bottom-0 left-0 right-0 h-4 cursor-ns-resize z-40 hover:bg-gray-200/50 transition-colors"
          onMouseDown={(e) => {
            e.stopPropagation()
            const event = new CustomEvent('schedule-resize-start', {
              detail: { itemId: item.id, edge: 'bottom', startY: e.clientY, item }
            })
            window.dispatchEvent(event)
          }}
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-gray-50/0 via-gray-50/20 to-gray-50/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      {item.notes && (
        <div className="absolute bottom-3 right-3 text-gray-400 z-20">
          <MessageSquare className="h-4 w-4" />
        </div>
      )}

      <div className="relative z-10 flex gap-3 h-full">
        <div className={`w-1 rounded-full ${getColorForType(item)} flex-shrink-0`} />
        
            <div className="flex-1 min-w-0 overflow-hidden pr-14">
          <h3 className="font-semibold text-base text-gray-900 mb-1 line-clamp-1">
            {item.name}
          </h3>
          <p className="text-xs text-gray-600 mb-1">
            {formatMilitaryTime(item.time_in)} - {formatMilitaryTime(item.time_out)}
          </p>
          {item._expedition_staff && (
            <>
              <div className="flex items-center gap-2">
                <Avatar className="h-4 w-4">
                  <AvatarFallback className="text-[9px] bg-gray-200 text-gray-700">
                    {item._expedition_staff.name?.split(" ").map((n: string) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-gray-500 truncate">
                  {item._expedition_staff.name}
                  {item.participants && item.participants.length > 0 && (
                    <span> • {item.participants.map((p: any) => p.name).join(", ")}</span>
                  )}
                </span>
              </div>
              {(item.address || item.things_to_bring || item.notes) && (
                <div className="h-px bg-gray-100 my-1.5" />
              )}
            </>
          )}
          {item.address && (
            <p className="text-xs text-gray-500 line-clamp-1">
              {item.address}
            </p>
          )}
          {item.things_to_bring && (
            <p className="text-xs text-gray-500 line-clamp-1">
              {item.things_to_bring}
            </p>
          )}
          {(item.address || item.things_to_bring) && item.notes && (
            <div className="h-px bg-gray-100 my-1.5" />
          )}
          {item.notes && (
            <p className="text-xs text-gray-600 line-clamp-1">
              {item.notes}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

