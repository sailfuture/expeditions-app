"use client"

import React, { useRef, useEffect } from "react"
import { useDraggable } from "@dnd-kit/core"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MessageSquare, GripVertical, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"

// Check if an item is an actual meal type (Breakfast, Lunch, Dinner) - not prep or dishes
const MEAL_TYPE_IDS = [5, 6, 7] // Breakfast, Lunch, Dinner type IDs
const EXACT_MEAL_NAMES = ['breakfast', 'lunch', 'dinner']

function isMealType(item: any): boolean {
  if (!item) return false
  const typeId = item.expedition_schedule_item_types_id || item._expedition_schedule_item_types?.id
  const typeName = (item._expedition_schedule_item_types?.name || '').toLowerCase().trim()
  // Only match exact meal names, not prep/dishes variants
  if (MEAL_TYPE_IDS.includes(typeId)) {
    // If we have a type name, make sure it's an exact match
    if (typeName && !EXACT_MEAL_NAMES.includes(typeName)) {
      return false
    }
    return true
  }
  return EXACT_MEAL_NAMES.includes(typeName)
}

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
    // In edit mode, directly open the edit sheet
    if (editMode) {
      onEdit()
      return
    }
    onClick()
  }

  // Calculate resize handle height - 15% of item height, min 8px, max 24px
  const itemHeightPx = parseFloat(position.height) || 100
  const resizeHandleHeight = Math.min(24, Math.max(8, itemHeightPx * 0.15))

  const style: React.CSSProperties = {
    top: position.top,
    height: position.height,
    left: `${leftPercent}%`,
    width: `${widthPercent}%`,
    // Don't apply transform - the DragOverlay handles the visual movement during drag
    // The original item stays in place and only updates when data changes
    zIndex: isResizing ? 1000 : undefined,
    // Hide the original item while dragging - the DragOverlay shows the preview
    opacity: isCurrentlyDragging ? 0 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "absolute mx-2 md:mx-4 rounded-xl border-2 p-2 bg-white overflow-hidden group",
        isCurrentlyDragging 
          ? "border-blue-400 shadow-2xl cursor-grabbing" 
          : editMode 
            ? "border-gray-100 hover:shadow-lg cursor-grab active:cursor-grabbing"
            : "border-gray-100 hover:shadow-lg cursor-pointer"
      )}
      style={style}
      onClick={handleClick}
      {...(editMode ? { ...listeners, ...attributes } : {})}
    >
      {/* Drag handle indicator - positioned on right side (only in edit mode) */}
      {editMode && (
        <div 
          className="absolute top-0 bottom-0 right-0 w-12 flex flex-col items-center justify-center z-30 bg-gradient-to-l from-gray-50 to-transparent opacity-0 group-hover:opacity-100 transition-all pointer-events-none"
        >
          <GripVertical className="h-5 w-5 text-gray-400" />
        </div>
      )}

      {/* Edit button and duration - top right, inline */}
      <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
        {/* Edit button - visible for admins (always), not just in edit mode */}
        {isAdmin && (
          <button
            className="bg-white rounded-full h-5 w-5 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer flex items-center justify-center z-50 relative opacity-0 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
          >
            <Pencil className="h-2.5 w-2.5 text-gray-500" />
          </button>
        )}
        {/* Duration - under gradient */}
        <span className="text-[10px] text-gray-500 font-medium z-20 relative">
          {getDuration(item.time_in, item.time_out)}
        </span>
      </div>

      {/* Top resize handle (only in edit mode) - height scales with item size */}
      {editMode && (
        <div 
          className="absolute top-0 left-0 right-0 cursor-ns-resize z-50 hover:bg-gray-300/30 transition-colors"
          style={{ cursor: 'ns-resize', height: resizeHandleHeight }}
          onMouseDown={(e) => {
            e.stopPropagation()
            e.preventDefault()
            const event = new CustomEvent('schedule-resize-start', {
              detail: { itemId: item.id, edge: 'top', startY: e.clientY, item }
            })
            window.dispatchEvent(event)
          }}
          onPointerDown={(e) => {
            e.stopPropagation()
          }}
        />
      )}

      {/* Bottom resize handle (only in edit mode) - height scales with item size */}
      {editMode && (
        <div 
          className="absolute bottom-0 left-0 right-0 cursor-ns-resize z-50 hover:bg-gray-300/30 transition-colors"
          style={{ cursor: 'ns-resize', height: resizeHandleHeight }}
          onMouseDown={(e) => {
            e.stopPropagation()
            e.preventDefault()
            const event = new CustomEvent('schedule-resize-start', {
              detail: { itemId: item.id, edge: 'bottom', startY: e.clientY, item }
            })
            window.dispatchEvent(event)
          }}
          onPointerDown={(e) => {
            e.stopPropagation()
          }}
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-gray-50/0 via-gray-50/20 to-gray-50/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      {item.notes && (
        <div className="absolute bottom-1.5 right-1.5 text-gray-400 z-20">
          <MessageSquare className="h-3 w-3" />
        </div>
      )}

      <div className="relative z-10 flex gap-2 h-full">
        <div className={`w-1 rounded-full ${getColorForType(item)} flex-shrink-0`} />
        
            <div className="flex-1 min-w-0 overflow-hidden pr-12">
          <h3 className="font-semibold text-sm text-gray-900 leading-tight line-clamp-1">
            {item.name}
          </h3>
          <p className="text-[11px] text-gray-600 leading-tight">
            {formatMilitaryTime(item.time_in)} - {formatMilitaryTime(item.time_out)}
          </p>
          {item._expedition_staff && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <Avatar className="h-3.5 w-3.5">
                  <AvatarFallback className="text-[8px] bg-gray-200 text-gray-700">
                    {item._expedition_staff.name?.split(" ").map((n: string) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[11px] text-gray-500 truncate">
                  {item._expedition_staff.name}
                </span>
                {/* Staff participants as circle initials */}
                {item.participants && item.participants.length > 0 && (
                  <div className="flex items-center -space-x-0.5">
                    {item.participants.slice(0, 3).map((p: any) => (
                      <Avatar key={p.id} className="h-3.5 w-3.5 border border-white">
                        <AvatarFallback className="text-[7px] bg-gray-300 text-gray-700">
                          {p.name?.split(" ").map((n: string) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {item.participants.length > 3 && (
                      <span className="text-[7px] text-gray-500 pl-0.5">+{item.participants.length - 3}</span>
                    )}
                  </div>
                )}
                {/* Student participants with photos */}
                {item.students_id && item.students_id.filter((s: any) => s != null).length > 0 && (
                  <div className="flex items-center -space-x-0.5">
                    {item.students_id.filter((s: any) => s != null).slice(0, 3).map((s: any, idx: number) => (
                      <Avatar key={s.id || `student-${idx}`} className="h-3.5 w-3.5 border border-white">
                        {s.profileImage ? (
                          <AvatarImage src={s.profileImage} alt={`${s.firstName} ${s.lastName}`} />
                        ) : null}
                        <AvatarFallback className="text-[7px] bg-gray-300 text-gray-700">
                          {s.firstName?.[0]}{s.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {item.students_id.filter((s: any) => s != null).length > 3 && (
                      <span className="text-[7px] text-gray-500 pl-0.5">+{item.students_id.filter((s: any) => s != null).length - 3}</span>
                    )}
                  </div>
                )}
              </div>
          )}
          {/* Meal Plan - for meal type items */}
          {isMealType(item) && (
            <div className="flex items-center gap-1 mt-0.5">
              {item._expedition_cookbook?.recipe_photo && (
                <Avatar className="h-3.5 w-3.5">
                  <AvatarImage src={item._expedition_cookbook.recipe_photo} alt={item._expedition_cookbook.recipe_name} />
                  <AvatarFallback className="text-[6px] bg-orange-100 text-orange-600">🍽</AvatarFallback>
                </Avatar>
              )}
              <p className={`text-[10px] truncate ${
                item._expedition_cookbook?.recipe_name || item.expedition_cookbook_id > 0 
                  ? 'text-gray-600' 
                  : 'text-gray-400 italic'
              }`}>
                {item._expedition_cookbook?.recipe_name || (item.expedition_cookbook_id > 0 ? `Meal Plan #${item.expedition_cookbook_id}` : 'No Meal Plan')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

