"use client"

import { useMemo, useState } from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { COUNTRIES, PORTS, normalizeSearch, type PortDefinition } from "@/lib/ports"

const MAX_RESULTS = 80

interface CountryComboboxProps {
  id?: string
  value: string
  onChange: (country: string) => void
}

/**
 * Searchable country picker. Any text that does not match a known country can
 * still be used as-is, so unusual territories are never blocked.
 */
export function CountryCombobox({ id, value, onChange }: CountryComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const results = useMemo(() => {
    const q = normalizeSearch(search)
    const list = q ? COUNTRIES.filter((c) => normalizeSearch(c).includes(q)) : COUNTRIES
    return list.slice(0, MAX_RESULTS)
  }, [search])

  const trimmed = search.trim()
  const hasExactMatch = trimmed
    ? COUNTRIES.some((c) => normalizeSearch(c) === normalizeSearch(trimmed))
    : true

  const select = (country: string) => {
    onChange(country)
    setSearch("")
    setOpen(false)
  }

  return (
    <Popover modal open={open} onOpenChange={(next) => { setOpen(next); if (!next) setSearch("") }}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between cursor-pointer font-normal", !value && "text-muted-foreground")}
        >
          <span className="truncate">{value || "Select country..."}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start" sideOffset={5}>
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search country..." value={search} onValueChange={setSearch} />
          <CommandList className="max-h-[280px] overflow-y-auto">
            <CommandEmpty>No country found.</CommandEmpty>
            {!hasExactMatch && (
              <CommandGroup>
                <CommandItem value={`__custom__${trimmed}`} onSelect={() => select(trimmed)} className="cursor-pointer">
                  <Plus className="mr-2 h-4 w-4" />
                  Use &ldquo;{trimmed}&rdquo;
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup>
              {results.map((country) => (
                <CommandItem key={country} value={country} onSelect={() => select(country)} className="cursor-pointer">
                  <Check className={cn("mr-2 h-4 w-4", value === country ? "opacity-100" : "opacity-0")} />
                  {country}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

interface PortComboboxProps {
  id?: string
  value: string
  /** Current country, used to float that country's ports to the top. */
  country?: string
  onChange: (port: string) => void
  /** Called when a known port is picked so the form can fill country, coordinates and timezone. */
  onSelectPort?: (port: PortDefinition) => void
}

/**
 * Searchable port picker over the curated PORTS list. Matches on port name or
 * country, floats ports from the selected country first, and lets staff enter
 * a port that is not in the list.
 */
export function PortCombobox({ id, value, country, onChange, onSelectPort }: PortComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const results = useMemo(() => {
    const q = normalizeSearch(search)
    const matches = q
      ? PORTS.filter((port) => normalizeSearch(port.name).includes(q) || normalizeSearch(port.country).includes(q))
      : PORTS
    // Featured ports (SailFuture's regular route) first, then the selected
    // country's ports, then everything else, each group in list order.
    const selectedCountry = country ? normalizeSearch(country) : ""
    const rank = (port: PortDefinition) => {
      if (port.featured) return 0
      if (selectedCountry && normalizeSearch(port.country) === selectedCountry) return 1
      return 2
    }
    return matches
      .map((port, index) => ({ port, index, rank: rank(port) }))
      .sort((a, b) => a.rank - b.rank || a.index - b.index)
      .map(({ port }) => port)
      .slice(0, MAX_RESULTS)
  }, [search, country])

  const trimmed = search.trim()
  const hasExactMatch = trimmed
    ? PORTS.some((port) => normalizeSearch(port.name) === normalizeSearch(trimmed))
    : true

  const selectKnown = (port: PortDefinition) => {
    onChange(port.name)
    onSelectPort?.(port)
    setSearch("")
    setOpen(false)
  }

  const selectCustom = () => {
    onChange(trimmed)
    setSearch("")
    setOpen(false)
  }

  return (
    <Popover modal open={open} onOpenChange={(next) => { setOpen(next); if (!next) setSearch("") }}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between cursor-pointer font-normal", !value && "text-muted-foreground")}
        >
          <span className="truncate">{value || "Search port or country..."}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start" sideOffset={5}>
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search port or country..." value={search} onValueChange={setSearch} />
          <CommandList className="max-h-[280px] overflow-y-auto">
            <CommandEmpty>No port found.</CommandEmpty>
            {!hasExactMatch && (
              <CommandGroup>
                <CommandItem value={`__custom__${trimmed}`} onSelect={selectCustom} className="cursor-pointer">
                  <Plus className="mr-2 h-4 w-4" />
                  Use &ldquo;{trimmed}&rdquo;
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup>
              {results.map((port) => {
                const key = `${port.name}|${port.country}`
                const isSelected = value === port.name && (!country || country === port.country)
                return (
                  <CommandItem key={key} value={key} onSelect={() => selectKnown(port)} className="cursor-pointer">
                    <Check className={cn("mr-2 h-4 w-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
                    <span className="truncate">{port.name}</span>
                    <span className="ml-auto pl-3 text-xs text-muted-foreground truncate">{port.country}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
