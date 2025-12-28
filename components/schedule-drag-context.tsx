"use client"

import { useState, useEffect, useCallback, useRef, ReactNode } from "react"
import { createPortal } from "react-dom"
import {
  DndContext,
  DragEndEvent,
  DragMoveEvent,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import { updateExpeditionScheduleItem } from "@/lib/xano"
import { toast } from "sonner"
import { mutate } from "swr"

interface ScheduleDragContextProps {
  children: ReactNode
  date: string
  timelineRef: React.RefObject<HTMLDivElement | null>
  items: any[]
  onItemUpdate: (itemId: number, timeIn: number, timeOut: number) => void
  onResizingChange?: (itemId: number | null) => void
  formatMilitaryTime: (time: number) => string
  getDuration: (timeIn: number, timeOut: number) => string
  getColorForType: (typeName: string) => string
  expeditionsId?: number
}

// Constants for the timeline
const TIMELINE_START_HOUR = 4 // 4 AM
const TIMELINE_HOURS = 20 // 20 hours (4 AM to 12 AM)
const SNAP_MINUTES = 15 // Snap to 15-minute intervals

// Convert pixel position to military time
const pixelToMilitaryTime = (
  pixelY: number,
  timelineHeight: number
): number => {
  const minutesFromStart = (pixelY / timelineHeight) * TIMELINE_HOURS * 60
  const totalMinutes = TIMELINE_START_HOUR * 60 + minutesFromStart
  
  // Snap to nearest interval
  const snappedMinutes = Math.round(totalMinutes / SNAP_MINUTES) * SNAP_MINUTES
  
  const hours = Math.floor(snappedMinutes / 60)
  const minutes = snappedMinutes % 60
  
  // Clamp hours between 0 and 24
  const clampedHours = Math.max(0, Math.min(24, hours))
  
  return clampedHours * 100 + minutes
}

// Convert military time to pixels
const militaryTimeToPixel = (
  militaryTime: number,
  timelineHeight: number
): number => {
  const hours = Math.floor(militaryTime / 100)
  const minutes = militaryTime % 100
  const totalMinutes = hours * 60 + minutes
  const minutesFromStart = totalMinutes - TIMELINE_START_HOUR * 60
  return (minutesFromStart / (TIMELINE_HOURS * 60)) * timelineHeight
}

export function ScheduleDragContext({
  children,
  date,
  timelineRef,
  items,
  onItemUpdate,
  onResizingChange,
  formatMilitaryTime,
  getDuration,
  getColorForType,
  expeditionsId,
}: ScheduleDragContextProps) {
  const [activeItem, setActiveItem] = useState<any>(null)
  const [snapPreview, setSnapPreview] = useState<{
    top: number
    height: number
    timeIn: number
    timeOut: number
  } | null>(null)
  const [resizing, setResizing] = useState<{
    itemId: number
    edge: "top" | "bottom"
    item: any
    startY: number
    originalTimeIn: number
    originalTimeOut: number
  } | null>(null)

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const item = active.data.current?.item
    if (item) {
      setActiveItem(item)
    }
  }

  const handleDragMove = (event: DragMoveEvent) => {
    const { active, delta } = event
    const item = active.data.current?.item
    
    if (!item || !timelineRef.current) {
      setSnapPreview(null)
      return
    }

    const timelineHeight = timelineRef.current.getBoundingClientRect().height
    const deltaMinutes = (delta.y / timelineHeight) * TIMELINE_HOURS * 60
    const snappedDeltaMinutes = Math.round(deltaMinutes / SNAP_MINUTES) * SNAP_MINUTES

    // Calculate new times
    const originalStartMinutes = Math.floor(item.time_in / 100) * 60 + (item.time_in % 100)
    const originalEndMinutes = Math.floor(item.time_out / 100) * 60 + (item.time_out % 100)
    
    const newStartMinutes = originalStartMinutes + snappedDeltaMinutes
    const newEndMinutes = originalEndMinutes + snappedDeltaMinutes
    
    // Clamp to valid range
    const minMinutes = TIMELINE_START_HOUR * 60
    const maxMinutes = (TIMELINE_START_HOUR + TIMELINE_HOURS) * 60
    
    if (newStartMinutes < minMinutes || newEndMinutes > maxMinutes) {
      setSnapPreview(null)
      return
    }
    
    const newTimeIn = Math.floor(newStartMinutes / 60) * 100 + (newStartMinutes % 60)
    const newTimeOut = Math.floor(newEndMinutes / 60) * 100 + (newEndMinutes % 60)

    // Calculate preview position
    const previewTop = militaryTimeToPixel(newTimeIn, timelineHeight)
    const previewBottom = militaryTimeToPixel(newTimeOut, timelineHeight)
    
    setSnapPreview({
      top: previewTop,
      height: previewBottom - previewTop,
      timeIn: newTimeIn,
      timeOut: newTimeOut,
    })
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, delta } = event
    const item = active.data.current?.item
    
    if (!item || !timelineRef.current) {
      setActiveItem(null)
    setSnapPreview(null)
      return
    }

    const timelineHeight = timelineRef.current.getBoundingClientRect().height
    const deltaMinutes = (delta.y / timelineHeight) * TIMELINE_HOURS * 60
    const snappedDeltaMinutes = Math.round(deltaMinutes / SNAP_MINUTES) * SNAP_MINUTES

    if (snappedDeltaMinutes === 0) {
      setActiveItem(null)
    setSnapPreview(null)
      return
    }

    // Calculate new times
    const originalStartMinutes = Math.floor(item.time_in / 100) * 60 + (item.time_in % 100)
    const originalEndMinutes = Math.floor(item.time_out / 100) * 60 + (item.time_out % 100)
    
    const newStartMinutes = originalStartMinutes + snappedDeltaMinutes
    const newEndMinutes = originalEndMinutes + snappedDeltaMinutes
    
    // Clamp to valid range (4 AM to 12 AM)
    const minMinutes = TIMELINE_START_HOUR * 60
    const maxMinutes = (TIMELINE_START_HOUR + TIMELINE_HOURS) * 60
    
    if (newStartMinutes < minMinutes || newEndMinutes > maxMinutes) {
      toast.error("Cannot move event outside schedule hours")
      setActiveItem(null)
    setSnapPreview(null)
      return
    }
    
    const newTimeIn = Math.floor(newStartMinutes / 60) * 100 + (newStartMinutes % 60)
    const newTimeOut = Math.floor(newEndMinutes / 60) * 100 + (newEndMinutes % 60)

    // Optimistic update - update local state immediately
    onItemUpdate(item.id, newTimeIn, newTimeOut)
    setActiveItem(null)
    setSnapPreview(null)

    const cacheKey = `expedition_schedule_items_date_${date}_${expeditionsId || 'all'}`
    
    // API call
    try {
      await updateExpeditionScheduleItem(item.id, {
        time_in: newTimeIn,
        time_out: newTimeOut,
      })
      // Use optimistic data update to prevent flash when server responds
      await mutate(cacheKey, (currentData: any[]) => {
        if (!currentData) return currentData
        return currentData.map((i: any) => 
          i.id === item.id 
            ? { ...i, time_in: newTimeIn, time_out: newTimeOut }
            : i
        )
      }, { revalidate: false })
      toast.success(`Moved to ${formatMilitaryTime(newTimeIn)} - ${formatMilitaryTime(newTimeOut)}`)
    } catch (error) {
      console.error("Failed to update schedule item:", error)
      toast.error("Failed to update time")
      // Revert optimistic update - refetch from server
      await mutate(cacheKey)
    }
  }

  // Handle resize events
  useEffect(() => {
    const handleResizeStart = (e: CustomEvent) => {
      const { itemId, edge, startY, item } = e.detail
      setResizing({
        itemId,
        edge,
        item,
        startY,
        originalTimeIn: item.time_in,
        originalTimeOut: item.time_out,
      })
      onResizingChange?.(itemId)
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizing || !timelineRef.current) return

      const timelineRect = timelineRef.current.getBoundingClientRect()
      const timelineHeight = timelineRect.height
      const deltaY = e.clientY - resizing.startY

      const deltaMinutes = (deltaY / timelineHeight) * TIMELINE_HOURS * 60
      const snappedDeltaMinutes = Math.round(deltaMinutes / SNAP_MINUTES) * SNAP_MINUTES

      let newTimeIn = resizing.originalTimeIn
      let newTimeOut = resizing.originalTimeOut

      if (resizing.edge === "top") {
        const originalStartMinutes = Math.floor(resizing.originalTimeIn / 100) * 60 + (resizing.originalTimeIn % 100)
        const newStartMinutes = originalStartMinutes + snappedDeltaMinutes
        
        // Ensure minimum 15 minutes duration
        const endMinutes = Math.floor(resizing.originalTimeOut / 100) * 60 + (resizing.originalTimeOut % 100)
        if (newStartMinutes >= endMinutes - 15) return
        if (newStartMinutes < TIMELINE_START_HOUR * 60) return
        
        newTimeIn = Math.floor(newStartMinutes / 60) * 100 + (newStartMinutes % 60)
      } else {
        const originalEndMinutes = Math.floor(resizing.originalTimeOut / 100) * 60 + (resizing.originalTimeOut % 100)
        const newEndMinutes = originalEndMinutes + snappedDeltaMinutes
        
        // Ensure minimum 15 minutes duration
        const startMinutes = Math.floor(resizing.originalTimeIn / 100) * 60 + (resizing.originalTimeIn % 100)
        if (newEndMinutes <= startMinutes + 15) return
        if (newEndMinutes > (TIMELINE_START_HOUR + TIMELINE_HOURS) * 60) return
        
        newTimeOut = Math.floor(newEndMinutes / 60) * 100 + (newEndMinutes % 60)
      }

      // Optimistic update during resize
      onItemUpdate(resizing.itemId, newTimeIn, newTimeOut)
    }

    const handleMouseUp = async () => {
      if (!resizing) return

      const item = items.find(i => i.id === resizing.itemId)
      if (!item) {
        setResizing(null)
        onResizingChange?.(null)
        return
      }

      // If times didn't change, just reset
      if (item.time_in === resizing.originalTimeIn && item.time_out === resizing.originalTimeOut) {
        setResizing(null)
        onResizingChange?.(null)
        return
      }

      // API call
      const cacheKey = `expedition_schedule_items_date_${date}_${expeditionsId || 'all'}`
      const newTimeIn = item.time_in
      const newTimeOut = item.time_out
      const itemId = resizing.itemId
      
      try {
        await updateExpeditionScheduleItem(itemId, {
          time_in: newTimeIn,
          time_out: newTimeOut,
        })
        // Use optimistic data update to prevent flash when server responds
        await mutate(cacheKey, (currentData: any[]) => {
          if (!currentData) return currentData
          return currentData.map((i: any) => 
            i.id === itemId 
              ? { ...i, time_in: newTimeIn, time_out: newTimeOut }
              : i
          )
        }, { revalidate: false })
        toast.success(`Updated to ${formatMilitaryTime(newTimeIn)} - ${formatMilitaryTime(newTimeOut)}`)
      } catch (error) {
        console.error("Failed to update schedule item:", error)
        toast.error("Failed to update time")
        // Revert optimistic update - refetch from server
        await mutate(cacheKey)
      }

      setResizing(null)
      onResizingChange?.(null)
    }

    window.addEventListener("schedule-resize-start" as any, handleResizeStart)
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      window.removeEventListener("schedule-resize-start" as any, handleResizeStart)
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [resizing, timelineRef, items, date, onItemUpdate, onResizingChange, formatMilitaryTime])

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToVerticalAxis]}
    >
      {children}
      
      {/* Snap Preview Indicator - rendered via portal into timeline */}
      {snapPreview && timelineRef.current && createPortal(
        <div
          className="absolute pointer-events-none z-40 mx-2 md:mx-4 left-0 right-0"
          style={{
            top: snapPreview.top,
            height: snapPreview.height,
          }}
        >
          <div className="h-full w-full rounded-2xl border-2 border-dashed border-gray-300 bg-gray-100/50" />
          {/* Time label positioned above the preview with padding */}
          <div className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <span className="text-xs font-medium text-gray-600 bg-white px-2 py-1 rounded-full shadow-md border border-gray-200">
              {formatMilitaryTime(snapPreview.timeIn)} - {formatMilitaryTime(snapPreview.timeOut)}
            </span>
          </div>
        </div>,
        timelineRef.current
      )}
      
      <DragOverlay>
        {activeItem ? (
          <div className="bg-white rounded-2xl border-2 border-blue-400 shadow-2xl p-3 opacity-90 pointer-events-none min-w-[200px]">
            <div className="flex gap-3">
              <div className={`w-1 rounded-full ${getColorForType(activeItem._expedition_schedule_item_types?.name || activeItem.name)} flex-shrink-0`} />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base text-gray-900 mb-1 line-clamp-1">
                  {activeItem.name}
                </h3>
                <p className="text-xs text-gray-600">
                  {formatMilitaryTime(activeItem.time_in)} - {formatMilitaryTime(activeItem.time_out)}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

