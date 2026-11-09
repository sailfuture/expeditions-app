"use client"

import { Fragment, useState, type ReactNode } from "react"
import { Check, ChevronDown, X } from "lucide-react"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useIsPhone } from "@/hooks/use-is-phone"
import { cn } from "@/lib/utils"

export type PickerValue = string | number

export interface PickerOption<T = any> {
  value: PickerValue
  label: string
  /** Options with the same group render under one heading, in first-seen order. */
  group?: string
  /** Extra words the search should match (an email, a type name). */
  keywords?: string[]
  data?: T
}

interface MobilePickerProps<T = any> {
  options: PickerOption<T>[]
  /** The chosen value, or the chosen values when `multiple`. */
  value: PickerValue | PickerValue[] | null | undefined
  /** Keep the list open and let several options toggle. */
  multiple?: boolean
  /** Called with the picked option; for `multiple` once per toggle. */
  onChange: (value: PickerValue, option: PickerOption<T>) => void
  /** What the closed control shows. */
  renderValue: () => ReactNode
  /** One row in the list; defaults to the label with a check when selected. */
  renderOption?: (option: PickerOption<T>, selected: boolean) => ReactNode
  /** Heading of the phone sheet, and the trigger's accessible name. */
  title: string
  description?: string
  searchPlaceholder?: string
  emptyText?: string
  /** Replaces the list with a loading row (e.g. recipes still fetching). */
  loading?: boolean
  loadingText?: string
  disabled?: boolean
  triggerClassName?: string
  /** Popover panel class at md+; the phone sheet ignores it. */
  contentClassName?: string
}

/**
 * A searchable list of options. From md it is a Popover anchored to the
 * trigger; on a phone it is a bottom sheet, so the list is never clipped by
 * the sheet it sits in and the primitive handles dismissal (no `mousedown`
 * listener). The search box is not auto-focused on phones, so the keyboard
 * does not cover the list before the user asks for it.
 */
export function MobilePicker<T = any>({
  options,
  value,
  multiple = false,
  onChange,
  renderValue,
  renderOption,
  title,
  description,
  searchPlaceholder = "Search...",
  emptyText = "Nothing found",
  loading = false,
  loadingText = "Loading...",
  disabled = false,
  triggerClassName,
  contentClassName,
}: MobilePickerProps<T>) {
  const [open, setOpen] = useState(false)
  const isPhone = useIsPhone()

  const selectedValues = new Set<string>(
    (Array.isArray(value) ? value : value === null || value === undefined ? [] : [value]).map(String)
  )
  const isSelected = (o: PickerOption<T>) => selectedValues.has(String(o.value))

  const pick = (option: PickerOption<T>) => {
    onChange(option.value, option)
    if (!multiple) setOpen(false)
  }

  // Group while keeping first-seen order; ungrouped options come first.
  const groups: { name: string | undefined; items: PickerOption<T>[] }[] = []
  for (const o of options) {
    const existing = groups.find((g) => g.name === o.group)
    if (existing) existing.items.push(o)
    else groups.push({ name: o.group, items: [o] })
  }

  const list = (
    <Command className={cn("rounded-none bg-transparent", isPhone ? "flex-1 min-h-0" : "")}>
      <CommandInput placeholder={searchPlaceholder} autoFocus={isPhone === false} className="h-11 text-base md:h-10 md:text-sm" />
      <CommandList className={cn(isPhone ? "max-h-none flex-1 pb-[env(safe-area-inset-bottom)]" : "max-h-[min(320px,50vh)]")}>
        {loading ? (
          <div className="px-4 py-6 text-center text-sm text-gray-500">{loadingText}</div>
        ) : (
          <>
            <CommandEmpty>{emptyText}</CommandEmpty>
            {groups.map((g, gi) => (
              <Fragment key={g.name ?? `__ungrouped_${gi}`}>
                {gi > 0 && <CommandSeparator />}
                <CommandGroup heading={g.name}>
                  {g.items.map((option) => {
                    const selected = isSelected(option)
                    return (
                      <CommandItem
                        key={String(option.value)}
                        // cmdk matches on `value` (made unique with the id) plus keywords
                        value={`${option.label} #${option.value}`}
                        keywords={option.keywords}
                        onSelect={() => pick(option)}
                        className={cn("min-h-11 gap-3 px-3 py-2.5 md:min-h-9 md:py-2", selected && "bg-gray-50")}
                      >
                        {renderOption ? (
                          renderOption(option, selected)
                        ) : (
                          <>
                            <span className="flex-1 truncate text-sm">{option.label}</span>
                            {selected && <Check className="h-4 w-4 shrink-0 text-gray-700" />}
                          </>
                        )}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </Fragment>
            ))}
          </>
        )}
      </CommandList>
    </Command>
  )

  const trigger = (
    <button
      type="button"
      disabled={disabled}
      aria-label={title}
      aria-haspopup="listbox"
      aria-expanded={open}
      onClick={isPhone ? () => setOpen(true) : undefined}
      className={cn(
        "flex w-full min-h-12 cursor-pointer items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-left transition-colors hover:bg-gray-50",
        open && "ring-2 ring-gray-400 ring-offset-2",
        disabled && "cursor-not-allowed opacity-60",
        triggerClassName
      )}
    >
      <div className="min-w-0 flex-1">{renderValue()}</div>
      <ChevronDown className={cn("h-4 w-4 shrink-0 text-gray-400 transition-transform", open && "rotate-180")} />
    </button>
  )

  if (isPhone) {
    return (
      <>
        {trigger}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="flex h-[85dvh] flex-col gap-0 rounded-t-2xl p-0" aria-describedby={undefined}>
            <div className="flex shrink-0 justify-center pt-2" aria-hidden="true">
              <span className="h-1.5 w-10 rounded-full bg-gray-300" />
            </div>
            <SheetHeader className="shrink-0 flex-row items-start justify-between gap-3 border-b px-4 pb-3 pt-2">
              <div className="min-w-0">
                <SheetTitle className="text-base">{title}</SheetTitle>
                {description && <SheetDescription className="text-xs">{description}</SheetDescription>}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-gray-100"
                aria-label="Done"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </SheetHeader>
            {list}
          </SheetContent>
        </Sheet>
      </>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className={cn("w-[var(--radix-popover-trigger-width)] min-w-[280px] p-0", contentClassName)}
      >
        {list}
      </PopoverContent>
    </Popover>
  )
}
