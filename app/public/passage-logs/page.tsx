"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Moon, Sun, HelpCircle, ChevronsUpDown, Check, ChevronDown } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"

// Simple native select component for reliability on mobile/iPad
interface SimpleSelectProps {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  id?: string
  className?: string
  invalid?: boolean
}

function SimpleSelect({ value, onChange, options, placeholder = "Select an option", id, className, invalid }: SimpleSelectProps) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={invalid}
      className={cn(
        "flex h-11 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base shadow-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "dark:bg-input/30 dark:hover:bg-input/50",
        "cursor-pointer appearance-none bg-no-repeat bg-right pr-8",
        "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23888%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')]",
        "bg-[length:1rem] bg-[right_0.5rem_center]",
        !value && "text-muted-foreground",
        invalid && "border-destructive ring-destructive",
        className
      )}
    >
      <option value="" disabled>{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}

// Form data types
interface PassageFormData {
  // Step 1 - Overview
  date: Date | undefined
  time: string
  departureLocation: string
  destinationLocation: string
  windSpeed: string
  windDirection: string
  boatSpeed: string
  heading: string
  courseOverGround: string

  // Step 2 - Bridge Department
  logbookEntry: string
  plotPosition: string
  spotlightCharged: string
  latitudeDeg: string
  latitudeMin: string
  latitudeSec: string
  latitudeDir: string
  longitudeDeg: string
  longitudeMin: string
  longitudeSec: string
  longitudeDir: string
  binoculars: string
  vhfChannel16: string
  fuelDayTank: string
  grayWaterTank: string
  blackWaterTank: string
  portWaterTank: string
  starboardWaterTank: string
  chilledWaterTemp: string
  voltageAmpDraw: string
  serviceBatteryVoltage: string
  electronicsBatteryVoltage: string
  engineBatteryVoltage: string
  emergencyBatteryVoltage: string

  // Step 3 - Engineering Department
  mainEngineRpm: string
  mainEngineGearOilPressure: string
  mainEngineOilPressure: string
  mainEngineTemp: string
  mainEngineValveCoverTemp: string
  generatorOilTemp: string
  generatorOilPressure: string

  // Step 4 - Deck Department
  catamaranSecure: string
  sternRibSecure: string
  bowRibSecure: string
  fuelCansSecure: string
  jackLinesSecure: string
  anchorsSecure: string
  sailingLinesClean: string
  rsCatMastSecure: string

  // Step 5 - Interior Department
  salonItemsSecure: string
  galleyItemsSecure: string
  allCabinItemsSecure: string
  forepeakFreezerTemp: string
  salonFridgeTemp: string
  galleyTopFridgeTemp: string
  galleyBottomFreezerTemp: string
  lazaretteDeepFreezerTemp: string
  propaneSolenoidOff: string
  ovenBreakerOff: string

  // Step 6 - Confirmation
  crewMembers: string[]
  generalObservations: string
  additionalNotes: string
  approvedBy: string
}

const initialFormData: PassageFormData = {
  date: undefined,
  time: "",
  departureLocation: "",
  destinationLocation: "",
  windSpeed: "",
  windDirection: "",
  boatSpeed: "",
  heading: "",
  courseOverGround: "",
  logbookEntry: "",
  plotPosition: "",
  spotlightCharged: "",
  latitudeDeg: "",
  latitudeMin: "",
  latitudeSec: "",
  latitudeDir: "",
  longitudeDeg: "",
  longitudeMin: "",
  longitudeSec: "",
  longitudeDir: "",
  binoculars: "",
  vhfChannel16: "",
  fuelDayTank: "",
  grayWaterTank: "",
  blackWaterTank: "",
  portWaterTank: "",
  starboardWaterTank: "",
  chilledWaterTemp: "",
  voltageAmpDraw: "",
  serviceBatteryVoltage: "",
  electronicsBatteryVoltage: "",
  engineBatteryVoltage: "",
  emergencyBatteryVoltage: "",
  mainEngineRpm: "",
  mainEngineGearOilPressure: "",
  mainEngineOilPressure: "",
  mainEngineTemp: "",
  mainEngineValveCoverTemp: "",
  generatorOilTemp: "",
  generatorOilPressure: "",
  catamaranSecure: "",
  sternRibSecure: "",
  bowRibSecure: "",
  fuelCansSecure: "",
  jackLinesSecure: "",
  anchorsSecure: "",
  sailingLinesClean: "",
  rsCatMastSecure: "",
  salonItemsSecure: "",
  galleyItemsSecure: "",
  allCabinItemsSecure: "",
  forepeakFreezerTemp: "",
  salonFridgeTemp: "",
  galleyTopFridgeTemp: "",
  galleyBottomFreezerTemp: "",
  lazaretteDeepFreezerTemp: "",
  propaneSolenoidOff: "",
  ovenBreakerOff: "",
  crewMembers: [],
  generalObservations: "",
  additionalNotes: "",
  approvedBy: "",
}

const completedOptions = [
  { value: "completed", label: "✅ Completed" },
  { value: "not_completed", label: "❌ Not Completed" },
  { value: "see_notes", label: "✏️ See Notes" },
]

const secureOptions = [
  { value: "secure", label: "✅ Secure" },
  { value: "not_secure", label: "❌ Not Secure" },
  { value: "see_notes", label: "✏️ See Notes" },
]

const yesNoOptions = [
  { value: "yes", label: "✅ Yes" },
  { value: "no", label: "❌ No" },
  { value: "see_notes", label: "✏️ See Notes" },
]

const tankLevelOptions = [
  { value: "0/4", label: "0/4 (Empty)" },
  { value: "1/4", label: "1/4" },
  { value: "2/4", label: "2/4 (Half)" },
  { value: "3/4", label: "3/4" },
  { value: "4/4", label: "4/4 (Full)" },
]

const latDirOptions = [
  { value: "N", label: "N (North)" },
  { value: "S", label: "S (South)" },
]

const lonDirOptions = [
  { value: "E", label: "E (East)" },
  { value: "W", label: "W (West)" },
]

// Helper component for tooltips on labels
function LabelWithTooltip({ 
  htmlFor, 
  children, 
  tooltip 
}: { 
  htmlFor: string
  children: React.ReactNode
  tooltip: string 
}) {
  return (
    <FieldLabel htmlFor={htmlFor} className="flex items-center gap-1.5">
      {children}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </FieldLabel>
  )
}

// Section Card component for form areas
function FormSection({ 
  title, 
  description,
  children,
  footer
}: { 
  title: string
  description?: string
  children: React.ReactNode 
  footer?: React.ReactNode
}) {
  return (
    <Card className="mb-6">
      <CardHeader className="pb-4 border-b gap-0">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {description && (
          <CardDescription className="text-sm text-muted-foreground">
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="pt-4">
        {children}
        {footer && (
          <div className="flex items-center gap-3 pt-6 mt-6 border-t">
            {footer}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface Location {
  id: number
  port: string
  country: string
}

interface Student {
  id: number
  firstName: string
  lastName: string
}

interface Staff {
  id: number
  name: string
}

interface ActiveExpedition {
  id: number
  name: string
}

const getFullName = (person: { firstName?: string; lastName?: string } | null | undefined) => {
  if (!person) return ""
  return [person.firstName, person.lastName].filter(Boolean).join(" ").trim()
}

export default function PassageLogsPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<PassageFormData>(initialFormData)
  const [isDark, setIsDark] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [locations, setLocations] = useState<Location[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [departureOpen, setDepartureOpen] = useState(false)
  const [destinationOpen, setDestinationOpen] = useState(false)
  const [dateOpen, setDateOpen] = useState(false)
  const [approvedByOpen, setApprovedByOpen] = useState(false)
  const [crewMembersOpen, setCrewMembersOpen] = useState(false)
  const [activeExpedition, setActiveExpedition] = useState<ActiveExpedition | null>(null)

  useEffect(() => {
    const savedTheme = localStorage.getItem("passage-logs-theme")
    if (savedTheme === "dark") {
      setIsDark(true)
      document.documentElement.classList.add("dark")
    }
  }, [])

  useEffect(() => {
    const fetchActiveExpedition = async () => {
      try {
        const response = await fetch("https://xsc3-mvx7-r86m.n7e.xano.io/api:bXFdqx8y/active_expedition")
        const data = await response.json()
        if (Array.isArray(data) && data.length > 0) {
          setActiveExpedition(data[0])
        }
      } catch (error) {
        console.error("Failed to fetch active expedition:", error)
      }
    }
    fetchActiveExpedition()
  }, [])

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await fetch("https://xsc3-mvx7-r86m.n7e.xano.io/api:bXFdqx8y/all_expedition_locations")
        const data = await response.json()
        if (Array.isArray(data)) {
          setLocations(data)
        }
      } catch (error) {
        console.error("Failed to fetch locations:", error)
      }
    }
    fetchLocations()
  }, [])

  useEffect(() => {
    const fetchPeople = async () => {
      try {
        const [studentsRes, staffRes] = await Promise.all([
          fetch("https://xsc3-mvx7-r86m.n7e.xano.io/api:bXFdqx8y/active_expedition_students"),
          fetch("https://xsc3-mvx7-r86m.n7e.xano.io/api:bXFdqx8y/active_expedition_staff")
        ])
        const studentsData = await studentsRes.json()
        const staffData = await staffRes.json()
        if (Array.isArray(studentsData)) {
          setStudents(studentsData)
        }
        if (Array.isArray(staffData)) {
          setStaff(staffData)
        }
      } catch (error) {
        console.error("Failed to fetch people:", error)
      }
    }
    fetchPeople()
  }, [])

  useEffect(() => {
    localStorage.setItem("passage-logs-theme", isDark ? "dark" : "light")
    if (isDark) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [isDark])

  const updateField = (field: keyof PassageFormData, value: string | Date | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const getInitials = (name: string | undefined | null) => {
    if (!name) return "?"
    return name
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  }

  const handleReset = () => {
    setFormData(initialFormData)
    setCurrentStep(1)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const toggleCrewMember = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      crewMembers: prev.crewMembers.includes(name)
        ? prev.crewMembers.filter((n) => n !== name)
        : [...prev.crewMembers, name]
    }))
  }

  // Track which fields are invalid
  const [invalidFields, setInvalidFields] = useState<Set<string>>(new Set())

  // Validation for each step - returns field keys that are invalid
  const validateStep = (step: number): { valid: boolean; invalidFieldKeys: string[]; missingCount: number } => {
    const invalidFieldKeys: string[] = []
    
    switch (step) {
      case 1: // Overview
        if (!formData.date) invalidFieldKeys.push("date")
        if (!formData.time) invalidFieldKeys.push("time")
        if (!formData.departureLocation) invalidFieldKeys.push("departureLocation")
        if (!formData.destinationLocation) invalidFieldKeys.push("destinationLocation")
        if (!formData.windSpeed) invalidFieldKeys.push("windSpeed")
        if (!formData.windDirection) invalidFieldKeys.push("windDirection")
        if (!formData.boatSpeed) invalidFieldKeys.push("boatSpeed")
        if (!formData.heading) invalidFieldKeys.push("heading")
        if (!formData.courseOverGround) invalidFieldKeys.push("courseOverGround")
        break
      case 2: // Bridge Department
        if (!formData.logbookEntry) invalidFieldKeys.push("logbookEntry")
        if (!formData.plotPosition) invalidFieldKeys.push("plotPosition")
        if (!formData.spotlightCharged) invalidFieldKeys.push("spotlightCharged")
        if (!formData.latitudeDeg) invalidFieldKeys.push("latitudeDeg")
        if (!formData.latitudeMin) invalidFieldKeys.push("latitudeMin")
        if (!formData.latitudeSec) invalidFieldKeys.push("latitudeSec")
        if (!formData.latitudeDir) invalidFieldKeys.push("latitudeDir")
        if (!formData.longitudeDeg) invalidFieldKeys.push("longitudeDeg")
        if (!formData.longitudeMin) invalidFieldKeys.push("longitudeMin")
        if (!formData.longitudeSec) invalidFieldKeys.push("longitudeSec")
        if (!formData.longitudeDir) invalidFieldKeys.push("longitudeDir")
        if (!formData.binoculars) invalidFieldKeys.push("binoculars")
        if (!formData.vhfChannel16) invalidFieldKeys.push("vhfChannel16")
        if (!formData.fuelDayTank) invalidFieldKeys.push("fuelDayTank")
        if (!formData.grayWaterTank) invalidFieldKeys.push("grayWaterTank")
        if (!formData.blackWaterTank) invalidFieldKeys.push("blackWaterTank")
        if (!formData.portWaterTank) invalidFieldKeys.push("portWaterTank")
        if (!formData.starboardWaterTank) invalidFieldKeys.push("starboardWaterTank")
        if (!formData.chilledWaterTemp) invalidFieldKeys.push("chilledWaterTemp")
        if (!formData.voltageAmpDraw) invalidFieldKeys.push("voltageAmpDraw")
        if (!formData.serviceBatteryVoltage) invalidFieldKeys.push("serviceBatteryVoltage")
        if (!formData.electronicsBatteryVoltage) invalidFieldKeys.push("electronicsBatteryVoltage")
        if (!formData.engineBatteryVoltage) invalidFieldKeys.push("engineBatteryVoltage")
        if (!formData.emergencyBatteryVoltage) invalidFieldKeys.push("emergencyBatteryVoltage")
        break
      case 3: // Engineering Department
        if (!formData.mainEngineRpm) invalidFieldKeys.push("mainEngineRpm")
        if (!formData.mainEngineGearOilPressure) invalidFieldKeys.push("mainEngineGearOilPressure")
        if (!formData.mainEngineOilPressure) invalidFieldKeys.push("mainEngineOilPressure")
        if (!formData.mainEngineTemp) invalidFieldKeys.push("mainEngineTemp")
        if (!formData.mainEngineValveCoverTemp) invalidFieldKeys.push("mainEngineValveCoverTemp")
        if (!formData.generatorOilTemp) invalidFieldKeys.push("generatorOilTemp")
        if (!formData.generatorOilPressure) invalidFieldKeys.push("generatorOilPressure")
        break
      case 4: // Deck Department
        if (!formData.catamaranSecure) invalidFieldKeys.push("catamaranSecure")
        if (!formData.sternRibSecure) invalidFieldKeys.push("sternRibSecure")
        if (!formData.bowRibSecure) invalidFieldKeys.push("bowRibSecure")
        if (!formData.fuelCansSecure) invalidFieldKeys.push("fuelCansSecure")
        if (!formData.jackLinesSecure) invalidFieldKeys.push("jackLinesSecure")
        if (!formData.anchorsSecure) invalidFieldKeys.push("anchorsSecure")
        if (!formData.sailingLinesClean) invalidFieldKeys.push("sailingLinesClean")
        if (!formData.rsCatMastSecure) invalidFieldKeys.push("rsCatMastSecure")
        break
      case 5: // Interior Department
        if (!formData.salonItemsSecure) invalidFieldKeys.push("salonItemsSecure")
        if (!formData.galleyItemsSecure) invalidFieldKeys.push("galleyItemsSecure")
        if (!formData.allCabinItemsSecure) invalidFieldKeys.push("allCabinItemsSecure")
        if (!formData.forepeakFreezerTemp) invalidFieldKeys.push("forepeakFreezerTemp")
        if (!formData.salonFridgeTemp) invalidFieldKeys.push("salonFridgeTemp")
        if (!formData.galleyTopFridgeTemp) invalidFieldKeys.push("galleyTopFridgeTemp")
        if (!formData.galleyBottomFreezerTemp) invalidFieldKeys.push("galleyBottomFreezerTemp")
        if (!formData.lazaretteDeepFreezerTemp) invalidFieldKeys.push("lazaretteDeepFreezerTemp")
        if (!formData.propaneSolenoidOff) invalidFieldKeys.push("propaneSolenoidOff")
        if (!formData.ovenBreakerOff) invalidFieldKeys.push("ovenBreakerOff")
        break
      case 6: // Confirmation
        if (formData.crewMembers.length === 0) invalidFieldKeys.push("crewMembers")
        if (!formData.approvedBy) invalidFieldKeys.push("approvedBy")
        // generalObservations and additionalNotes are optional
        break
    }
    
    return { valid: invalidFieldKeys.length === 0, invalidFieldKeys, missingCount: invalidFieldKeys.length }
  }

  // Check if a field is invalid
  const isFieldInvalid = (fieldKey: string) => invalidFields.has(fieldKey)

  // Clear invalid state when a field is updated
  const updateFieldAndClearInvalid = <K extends keyof PassageFormData>(key: K, value: PassageFormData[K]) => {
    updateField(key, value)
    if (invalidFields.has(key)) {
      setInvalidFields(prev => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  const handleNext = () => {
    const { valid, invalidFieldKeys, missingCount } = validateStep(currentStep)
    if (!valid) {
      setInvalidFields(new Set(invalidFieldKeys))
      toast.error(`Please complete all required fields`, {
        description: `${missingCount} field${missingCount > 1 ? 's' : ''} missing on this page`,
      })
      return
    }
    setInvalidFields(new Set())
    if (currentStep < 6) setCurrentStep(currentStep + 1)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handlePrevious = () => {
    setInvalidFields(new Set())
    if (currentStep > 1) setCurrentStep(currentStep - 1)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleSubmit = async () => {
    const { valid, invalidFieldKeys, missingCount } = validateStep(6)
    if (!valid) {
      setInvalidFields(new Set(invalidFieldKeys))
      toast.error(`Please complete all required fields`, {
        description: `${missingCount} field${missingCount > 1 ? 's' : ''} missing`,
      })
      return
    }
    setInvalidFields(new Set())
    setIsSubmitting(true)
    
    try {
      // Parse time into hours and minutes
      const timeParts = formData.time.split(":")
      const hrs = timeParts[0] ? parseInt(timeParts[0], 10) || 0 : 0
      const min = timeParts[1] ? parseInt(timeParts[1], 10) || 0 : 0

      // Get location names from IDs
      const departureLocation = locations.find(l => l.id.toString() === formData.departureLocation)
      const destinationLocation = locations.find(l => l.id.toString() === formData.destinationLocation)

      // Map crew member IDs to numbers
      const studentIds = formData.crewMembers.map(id => parseInt(id, 10)).filter(id => !isNaN(id))

      // Get staff ID
      const staffId = formData.approvedBy ? parseInt(formData.approvedBy, 10) || 0 : 0

      // Build the API payload
      const payload = {
        date: formData.date ? formData.date.toISOString().split('T')[0] : null,
        hrs,
        min,
        departure_location_name: departureLocation ? `${departureLocation.port}, ${departureLocation.country}` : "",
        destination_location_name: destinationLocation ? `${destinationLocation.port}, ${destinationLocation.country}` : "",
        wind_speed_kn: parseFloat(formData.windSpeed) || 0,
        wind_direction_deg: parseFloat(formData.windDirection) || 0,
        boat_speed_kn: parseFloat(formData.boatSpeed) || 0,
        heading_deg: parseFloat(formData.heading) || 0,
        course_over_ground_deg: parseFloat(formData.courseOverGround) || 0,
        bridge_logbook_entry_status: formData.logbookEntry,
        bridge_plot_position_status: formData.plotPosition,
        bridge_spotlight_charged_status: formData.spotlightCharged,
        latitude_deg: parseFloat(formData.latitudeDeg) || 0,
        latitude_min: parseFloat(formData.latitudeMin) || 0,
        latitude_sec: parseFloat(formData.latitudeSec) || 0,
        latitude_dir: formData.latitudeDir,
        longitude_deg: parseFloat(formData.longitudeDeg) || 0,
        longitude_min: parseFloat(formData.longitudeMin) || 0,
        longitude_sec: parseFloat(formData.longitudeSec) || 0,
        longitude_dir: formData.longitudeDir,
        bridge_binoculars_status: formData.binoculars,
        bridge_vhf_channel_16_status: formData.vhfChannel16,
        fuel_day_tank_current: formData.fuelDayTank,
        fuel_day_tank_total: "4/4",
        gray_water_tank_current: formData.grayWaterTank,
        gray_water_tank_total: "4/4",
        black_water_tank_current: formData.blackWaterTank,
        black_water_tank_total: "4/4",
        port_water_tank_current: formData.portWaterTank,
        port_water_tank_total: "4/4",
        starboard_water_tank_current: formData.starboardWaterTank,
        starboard_water_tank_total: "4/4",
        chilled_water_temp_f: parseFloat(formData.chilledWaterTemp) || 0,
        voltage_amp_draw_a: parseFloat(formData.voltageAmpDraw) || 0,
        service_battery_voltage_v: parseFloat(formData.serviceBatteryVoltage) || 0,
        electronics_battery_voltage_v: parseFloat(formData.electronicsBatteryVoltage) || 0,
        engine_battery_voltage_v: parseFloat(formData.engineBatteryVoltage) || 0,
        emergency_battery_voltage_v: parseFloat(formData.emergencyBatteryVoltage) || 0,
        main_engine_rpm: parseFloat(formData.mainEngineRpm) || 0,
        main_engine_gear_oil_pressure_psi: parseFloat(formData.mainEngineGearOilPressure) || 0,
        main_engine_oil_pressure_psi: parseFloat(formData.mainEngineOilPressure) || 0,
        main_engine_temp_f: parseFloat(formData.mainEngineTemp) || 0,
        main_engine_valve_cover_temp_f: parseFloat(formData.mainEngineValveCoverTemp) || 0,
        generator_oil_temp_f: parseFloat(formData.generatorOilTemp) || 0,
        generator_oil_pressure_psi: parseFloat(formData.generatorOilPressure) || 0,
        deck_catamaran_secure_status: formData.catamaranSecure,
        deck_stern_rib_secure_status: formData.sternRibSecure,
        deck_bow_rib_secure_status: formData.bowRibSecure,
        deck_fuel_cans_secure_status: formData.fuelCansSecure,
        deck_jack_lines_secure_status: formData.jackLinesSecure,
        deck_anchors_secure_status: formData.anchorsSecure,
        deck_sailing_lines_coiled_status: formData.sailingLinesClean,
        deck_rs_cat_mast_secure_to_toe_rail_status: formData.rsCatMastSecure,
        interior_salon_items_secure_status: formData.salonItemsSecure,
        interior_galley_items_secure_status: formData.galleyItemsSecure,
        interior_all_cabin_items_secure_status: formData.allCabinItemsSecure,
        forepeak_freezer_temp_f: formData.forepeakFreezerTemp,
        salon_fridge_temp_f: formData.salonFridgeTemp,
        galley_top_fridge_temp_f: formData.galleyTopFridgeTemp,
        galley_bottom_freezer_temp_f: formData.galleyBottomFreezerTemp,
        lazarette_deep_freezer_temp_f: formData.lazaretteDeepFreezerTemp,
        propane_solenoid_off: formData.propaneSolenoidOff,
        oven_breaker_off: formData.ovenBreakerOff,
        general_observations: formData.generalObservations,
        additional_notes: formData.additionalNotes,
        students_id: studentIds,
        expedition_staff_id: staffId,
      }

      const response = await fetch("https://xsc3-mvx7-r86m.n7e.xano.io/api:bXFdqx8y/expedition_passage_logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Failed to submit: ${response.status} ${response.statusText}`)
      }

      console.log("Form submitted successfully:", payload)
      setIsSubmitted(true)
    } catch (error) {
      console.error("Failed to submit passage log:", error)
      alert("Failed to submit passage log. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const expeditionName = activeExpedition?.name || "Loading..."
  const stepTitles = [
    { step: 1, title: "Overview", label: `Passage Record: ${expeditionName}` },
    { step: 2, title: "Bridge", label: "Bridge Department" },
    { step: 3, title: "Engineering", label: "Engineering Department" },
    { step: 4, title: "Deck", label: "Deck Department" },
    { step: 5, title: "Interior", label: "Interior Department" },
    { step: 6, title: "Confirmation", label: "Passage Log Approval" },
  ]

  const stepDescriptions = [
    "This record logs the condition of the vessel during a specific point in the voyage. It captures navigation data, system readings, equipment status, and safety checks to confirm the boat is operating safely and correctly.",
    "A bridge department checklist is a comprehensive list of tasks and items to verify and document the operational status and readiness of essential navigation, communication, and safety equipment on the vessel's bridge.",
    "The engineering passage checklist is used to ensure that all critical engine and generator parameters are regularly monitored and recorded, helping to maintain optimal performance and identify any potential issues early during the voyage.",
    "The deck department checklist ensures all deck equipment and items are secured and properly stowed to maintain safety and order during the voyage.",
    "The interior department checklist ensures all interior spaces are secure and temperatures are properly monitored.",
    "Review and submit the passage log with any additional observations.",
  ]

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center overflow-hidden">
                <Image 
                  src="/sailfuture-square (8).webp" 
                  alt="SailFuture Academy" 
                  width={80} 
                  height={80}
                  className="object-cover rounded-full"
                />
              </div>
              <h2 className="text-xl font-semibold mb-2">Passage Log Submitted!</h2>
              <p className="text-muted-foreground mb-6">
                Your passage log has been successfully recorded.
              </p>
              <Button
                onClick={() => {
                  setFormData(initialFormData)
                  setCurrentStep(1)
                  setIsSubmitted(false)
                }}
                className="cursor-pointer"
              >
                Submit Another Log
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col" style={{ minHeight: '-webkit-fill-available', minHeight: '100dvh' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b">
        <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image 
              src="/sailfuture-square (8).webp" 
              alt="SailFuture Academy" 
              width={36} 
              height={36}
              className="rounded-full"
            />
            <span className="font-semibold text-gray-900 dark:text-white">Passage Logs</span>
          </div>
          
          <div className="flex items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 cursor-pointer"
                >
                  Reset Form
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset Form?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will clear all entered data and return you to Step 1. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReset} className="cursor-pointer bg-red-600 text-white hover:bg-red-700">
                    Reset Form
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsDark(!isDark)}
              className="h-9 w-9 cursor-pointer"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-4xl mx-auto px-4 md:px-6 lg:px-8 pt-6 md:pt-8 pb-24 w-full">
        {/* Step Header Card */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle>{stepTitles[currentStep - 1].label}</CardTitle>
            <CardDescription>{stepDescriptions[currentStep - 1]}</CardDescription>
            <Progress value={(currentStep / 6) * 100} className="h-1 mt-4" />
          </CardHeader>
        </Card>


        {/* Step 1 - Overview */}
        {currentStep === 1 && (
          <>
            <FormSection title="Date & Locations" description="Records the date and time of the entry and where the vessel is coming from and going to.">
              <FieldSet>
                <FieldGroup>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field data-invalid={isFieldInvalid("date") || undefined}>
                      <FieldLabel htmlFor="date-picker">Date</FieldLabel>
                      <Popover open={dateOpen} onOpenChange={setDateOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            id="date-picker"
                            aria-invalid={isFieldInvalid("date")}
                            className={cn(
                              "w-full h-11 justify-between font-normal text-base",
                              isFieldInvalid("date") && "border-destructive"
                            )}
                          >
                            {formData.date ? (
                              formData.date.toLocaleDateString()
                            ) : (
                              <span className="text-muted-foreground">Select date</span>
                            )}
                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={formData.date}
                            onSelect={(date) => {
                              updateFieldAndClearInvalid("date", date)
                              setDateOpen(false)
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </Field>
                    <Field data-invalid={isFieldInvalid("time") || undefined}>
                      <FieldLabel>Time (24-hour)</FieldLabel>
                      <div className="flex items-center gap-2">
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={2}
                          value={formData.time.split(":")[0] || ""}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "").slice(0, 2)
                            const mins = formData.time.split(":")[1] || "00"
                            updateFieldAndClearInvalid("time", `${val}:${mins}`)
                          }}
                          placeholder="HH"
                          aria-invalid={isFieldInvalid("time")}
                          className={cn("flex-1 text-center h-11 text-base", isFieldInvalid("time") && "border-destructive")}
                        />
                        <span className="text-lg font-medium">:</span>
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={2}
                          value={formData.time.split(":")[1] || ""}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "").slice(0, 2)
                            const hrs = formData.time.split(":")[0] || "00"
                            updateFieldAndClearInvalid("time", `${hrs}:${val}`)
                          }}
                          placeholder="MM"
                          aria-invalid={isFieldInvalid("time")}
                          className={cn("flex-1 text-center h-11 text-base", isFieldInvalid("time") && "border-destructive")}
                        />
                      </div>
                      <FieldDescription>Enter time in 24-hour format (00:00 - 23:59)</FieldDescription>
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field data-invalid={isFieldInvalid("departureLocation") || undefined}>
                      <FieldLabel>Departure Location</FieldLabel>
                      <Popover open={departureOpen} onOpenChange={setDepartureOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={departureOpen}
                            aria-invalid={isFieldInvalid("departureLocation")}
                            className={cn(
                              "w-full h-11 justify-between font-normal cursor-pointer text-base",
                              isFieldInvalid("departureLocation") && "border-destructive"
                            )}
                          >
                            {formData.departureLocation ? (
                              <span className="truncate">{formData.departureLocation}</span>
                            ) : (
                              <span className="text-muted-foreground">Select An Option</span>
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
                          <Command>
                            <CommandInput placeholder="Search location..." className="h-11" />
                            <CommandList>
                              <CommandEmpty>No location found.</CommandEmpty>
                              <CommandGroup>
                                {locations.map((location) => (
                                  <CommandItem
                                    key={location.id}
                                    value={`${location.port}, ${location.country}`}
                                    onSelect={(currentValue) => {
                                      updateFieldAndClearInvalid("departureLocation", currentValue === formData.departureLocation ? "" : currentValue)
                                      setDepartureOpen(false)
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        formData.departureLocation === `${location.port}, ${location.country}` ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {location.port}, {location.country}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </Field>
                    <Field data-invalid={isFieldInvalid("destinationLocation") || undefined}>
                      <FieldLabel>Destination Location</FieldLabel>
                      <Popover open={destinationOpen} onOpenChange={setDestinationOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={destinationOpen}
                            aria-invalid={isFieldInvalid("destinationLocation")}
                            className={cn(
                              "w-full h-11 justify-between font-normal cursor-pointer text-base",
                              isFieldInvalid("destinationLocation") && "border-destructive"
                            )}
                          >
                            {formData.destinationLocation ? (
                              <span className="truncate">{formData.destinationLocation}</span>
                            ) : (
                              <span className="text-muted-foreground">Select An Option</span>
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
                          <Command>
                            <CommandInput placeholder="Search location..." className="h-11" />
                            <CommandList>
                              <CommandEmpty>No location found.</CommandEmpty>
                              <CommandGroup>
                                {locations.map((location) => (
                                  <CommandItem
                                    key={location.id}
                                    value={`${location.port}, ${location.country}`}
                                    onSelect={(currentValue) => {
                                      updateFieldAndClearInvalid("destinationLocation", currentValue === formData.destinationLocation ? "" : currentValue)
                                      setDestinationOpen(false)
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        formData.destinationLocation === `${location.port}, ${location.country}` ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {location.port}, {location.country}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </Field>
                  </div>
                </FieldGroup>
              </FieldSet>
            </FormSection>

            <FormSection title="Weather Conditions" description="Records the current wind speed and direction at the time of the entry.">
              <FieldSet>
                <FieldGroup>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field data-invalid={isFieldInvalid("windSpeed") || undefined}>
                      <LabelWithTooltip htmlFor="windSpeed" tooltip="Valid range: 0-80 knots">
                        Wind Speed
                      </LabelWithTooltip>
                      <InputGroup className={isFieldInvalid("windSpeed") ? "[&>input]:border-destructive" : ""}>
                        <InputGroupInput
                          id="windSpeed"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          max="80"
                          step="0.1"
                          value={formData.windSpeed}
                          onChange={(e) => updateFieldAndClearInvalid("windSpeed", e.target.value)}
                          placeholder="0-80"
                          aria-invalid={isFieldInvalid("windSpeed")}
                          className="h-11 text-base"
                        />
                        <InputGroupAddon align="inline-end">kns</InputGroupAddon>
                      </InputGroup>
                    </Field>
                    <Field data-invalid={isFieldInvalid("windDirection") || undefined}>
                      <LabelWithTooltip htmlFor="windDirection" tooltip="Valid range: 0-359 degrees">
                        Wind Direction
                      </LabelWithTooltip>
                      <InputGroup className={isFieldInvalid("windDirection") ? "[&>input]:border-destructive" : ""}>
                        <InputGroupInput
                          id="windDirection"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          max="359"
                          value={formData.windDirection}
                          onChange={(e) => updateFieldAndClearInvalid("windDirection", e.target.value)}
                          placeholder="0-359"
                          aria-invalid={isFieldInvalid("windDirection")}
                          className="h-11 text-base"
                        />
                        <InputGroupAddon align="inline-end">deg</InputGroupAddon>
                      </InputGroup>
                    </Field>
                  </div>
                </FieldGroup>
              </FieldSet>
            </FormSection>

            <FormSection title="Navigation" description="Records how the vessel is moving, including speed, heading, and course over ground.">
              <FieldSet>
                <FieldGroup>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Field data-invalid={isFieldInvalid("boatSpeed") || undefined}>
                      <LabelWithTooltip htmlFor="boatSpeed" tooltip="Valid range: 0-40 knots">
                        Boat Speed
                      </LabelWithTooltip>
                      <InputGroup className={isFieldInvalid("boatSpeed") ? "[&>input]:border-destructive" : ""}>
                        <InputGroupInput
                          id="boatSpeed"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          max="40"
                          step="0.1"
                          value={formData.boatSpeed}
                          onChange={(e) => updateFieldAndClearInvalid("boatSpeed", e.target.value)}
                          placeholder="0-40"
                          aria-invalid={isFieldInvalid("boatSpeed")}
                          className="h-11 text-base"
                        />
                        <InputGroupAddon align="inline-end">kns</InputGroupAddon>
                      </InputGroup>
                    </Field>
                    <Field data-invalid={isFieldInvalid("heading") || undefined}>
                      <LabelWithTooltip htmlFor="heading" tooltip="Valid range: 0-359 degrees">
                        Heading
                      </LabelWithTooltip>
                      <InputGroup className={isFieldInvalid("heading") ? "[&>input]:border-destructive" : ""}>
                        <InputGroupInput
                          id="heading"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          max="359"
                          value={formData.heading}
                          onChange={(e) => updateFieldAndClearInvalid("heading", e.target.value)}
                          placeholder="0-359"
                          aria-invalid={isFieldInvalid("heading")}
                          className="h-11 text-base"
                        />
                        <InputGroupAddon align="inline-end">deg</InputGroupAddon>
                      </InputGroup>
                    </Field>
                    <Field data-invalid={isFieldInvalid("courseOverGround") || undefined}>
                      <LabelWithTooltip htmlFor="courseOverGround" tooltip="Valid range: 0-359 degrees">
                        Course Over Ground
                      </LabelWithTooltip>
                      <InputGroup className={isFieldInvalid("courseOverGround") ? "[&>input]:border-destructive" : ""}>
                        <InputGroupInput
                          id="courseOverGround"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          max="359"
                          value={formData.courseOverGround}
                          onChange={(e) => updateFieldAndClearInvalid("courseOverGround", e.target.value)}
                          placeholder="0-359"
                          aria-invalid={isFieldInvalid("courseOverGround")}
                          className="h-11 text-base"
                        />
                        <InputGroupAddon align="inline-end">deg</InputGroupAddon>
                      </InputGroup>
                    </Field>
                  </div>
                </FieldGroup>
              </FieldSet>
            </FormSection>
          </>
        )}

        {/* Step 2 - Bridge Department */}
        {currentStep === 2 && (
          <>
            <FormSection title="Bridge Area" description="Checks the bridge and navigation station. Confirms charts are updated, radios are monitored, safety equipment is ready, and the vessel's position is accurately recorded.">
              <FieldSet>
                <FieldGroup>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Field data-invalid={isFieldInvalid("logbookEntry") || undefined}>
                      <FieldLabel htmlFor="logbookEntry">Logbook Entry</FieldLabel>
                      <SimpleSelect
                        id="logbookEntry"
                        value={formData.logbookEntry}
                        onChange={(v) => updateFieldAndClearInvalid("logbookEntry", v)}
                        options={completedOptions}
                        placeholder="Select an option"
                        invalid={isFieldInvalid("logbookEntry")}
                      />
                    </Field>
                    <Field data-invalid={isFieldInvalid("plotPosition") || undefined}>
                      <FieldLabel htmlFor="plotPosition">Plot Position on Chart</FieldLabel>
                      <SimpleSelect
                        id="plotPosition"
                        value={formData.plotPosition}
                        onChange={(v) => updateFieldAndClearInvalid("plotPosition", v)}
                        options={completedOptions}
                        placeholder="Select an option"
                        invalid={isFieldInvalid("plotPosition")}
                      />
                    </Field>
                    <Field data-invalid={isFieldInvalid("spotlightCharged") || undefined}>
                      <FieldLabel htmlFor="spotlightCharged">Spotlight Charged</FieldLabel>
                      <SimpleSelect
                        id="spotlightCharged"
                        value={formData.spotlightCharged}
                        onChange={(v) => updateFieldAndClearInvalid("spotlightCharged", v)}
                        options={completedOptions}
                        placeholder="Select an option"
                        invalid={isFieldInvalid("spotlightCharged")}
                      />
                    </Field>
                  </div>
                </FieldGroup>
              </FieldSet>
            </FormSection>

            <FormSection title="Position (DMS Format)">
              <FieldSet>
                <FieldGroup>
                  <FieldLegend variant="label">Latitude</FieldLegend>
                  <div className="grid grid-cols-4 gap-4">
                    <Field data-invalid={isFieldInvalid("latitudeDeg") || undefined}>
                      <LabelWithTooltip htmlFor="latitudeDeg" tooltip="Degrees: 0-90">
                        Degrees (°)
                      </LabelWithTooltip>
                      <InputGroup className={isFieldInvalid("latitudeDeg") ? "[&>input]:border-destructive" : ""}>
                        <InputGroupInput
                          id="latitudeDeg"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          max="90"
                          value={formData.latitudeDeg}
                          onChange={(e) => updateFieldAndClearInvalid("latitudeDeg", e.target.value)}
                          placeholder="0-90"
                          aria-invalid={isFieldInvalid("latitudeDeg")}
                          className="h-11 text-base"
                        />
                        <InputGroupAddon align="inline-end">°</InputGroupAddon>
                      </InputGroup>
                    </Field>
                    <Field data-invalid={isFieldInvalid("latitudeMin") || undefined}>
                      <LabelWithTooltip htmlFor="latitudeMin" tooltip="Minutes: 0-59">
                        Minutes (&apos;)
                      </LabelWithTooltip>
                      <InputGroup className={isFieldInvalid("latitudeMin") ? "[&>input]:border-destructive" : ""}>
                        <InputGroupInput
                          id="latitudeMin"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          max="59"
                          value={formData.latitudeMin}
                          onChange={(e) => updateFieldAndClearInvalid("latitudeMin", e.target.value)}
                          placeholder="0-59"
                          aria-invalid={isFieldInvalid("latitudeMin")}
                          className="h-11 text-base"
                        />
                        <InputGroupAddon align="inline-end">&apos;</InputGroupAddon>
                      </InputGroup>
                    </Field>
                    <Field data-invalid={isFieldInvalid("latitudeSec") || undefined}>
                      <LabelWithTooltip htmlFor="latitudeSec" tooltip="Seconds: 0-59">
                        Seconds (&quot;)
                      </LabelWithTooltip>
                      <InputGroup className={isFieldInvalid("latitudeSec") ? "[&>input]:border-destructive" : ""}>
                        <InputGroupInput
                          id="latitudeSec"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          max="59"
                          value={formData.latitudeSec}
                          onChange={(e) => updateFieldAndClearInvalid("latitudeSec", e.target.value)}
                          placeholder="0-59"
                          aria-invalid={isFieldInvalid("latitudeSec")}
                          className="h-11 text-base"
                        />
                        <InputGroupAddon align="inline-end">&quot;</InputGroupAddon>
                      </InputGroup>
                    </Field>
                    <Field data-invalid={isFieldInvalid("latitudeDir") || undefined}>
                      <FieldLabel htmlFor="latitudeDir">Direction</FieldLabel>
                      <SimpleSelect
                        id="latitudeDir"
                        value={formData.latitudeDir}
                        onChange={(v) => updateFieldAndClearInvalid("latitudeDir", v)}
                        options={latDirOptions}
                        placeholder="Select"
                        invalid={isFieldInvalid("latitudeDir")}
                      />
                    </Field>
                  </div>

                  <FieldLegend variant="label">Longitude</FieldLegend>
                  <div className="grid grid-cols-4 gap-4">
                    <Field data-invalid={isFieldInvalid("longitudeDeg") || undefined}>
                      <LabelWithTooltip htmlFor="longitudeDeg" tooltip="Degrees: 0-180">
                        Degrees (°)
                      </LabelWithTooltip>
                      <InputGroup className={isFieldInvalid("longitudeDeg") ? "[&>input]:border-destructive" : ""}>
                        <InputGroupInput
                          id="longitudeDeg"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          max="180"
                          value={formData.longitudeDeg}
                          onChange={(e) => updateFieldAndClearInvalid("longitudeDeg", e.target.value)}
                          placeholder="0-180"
                          aria-invalid={isFieldInvalid("longitudeDeg")}
                          className="h-11 text-base"
                        />
                        <InputGroupAddon align="inline-end">°</InputGroupAddon>
                      </InputGroup>
                    </Field>
                    <Field data-invalid={isFieldInvalid("longitudeMin") || undefined}>
                      <LabelWithTooltip htmlFor="longitudeMin" tooltip="Minutes: 0-59">
                        Minutes (&apos;)
                      </LabelWithTooltip>
                      <InputGroup className={isFieldInvalid("longitudeMin") ? "[&>input]:border-destructive" : ""}>
                        <InputGroupInput
                          id="longitudeMin"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          max="59"
                          value={formData.longitudeMin}
                          onChange={(e) => updateFieldAndClearInvalid("longitudeMin", e.target.value)}
                          placeholder="0-59"
                          aria-invalid={isFieldInvalid("longitudeMin")}
                          className="h-11 text-base"
                        />
                        <InputGroupAddon align="inline-end">&apos;</InputGroupAddon>
                      </InputGroup>
                    </Field>
                    <Field data-invalid={isFieldInvalid("longitudeSec") || undefined}>
                      <LabelWithTooltip htmlFor="longitudeSec" tooltip="Seconds: 0-59">
                        Seconds (&quot;)
                      </LabelWithTooltip>
                      <InputGroup className={isFieldInvalid("longitudeSec") ? "[&>input]:border-destructive" : ""}>
                        <InputGroupInput
                          id="longitudeSec"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          max="59"
                          value={formData.longitudeSec}
                          onChange={(e) => updateFieldAndClearInvalid("longitudeSec", e.target.value)}
                          placeholder="0-59"
                          aria-invalid={isFieldInvalid("longitudeSec")}
                          className="h-11 text-base"
                        />
                        <InputGroupAddon align="inline-end">&quot;</InputGroupAddon>
                      </InputGroup>
                    </Field>
                    <Field data-invalid={isFieldInvalid("longitudeDir") || undefined}>
                      <FieldLabel htmlFor="longitudeDir">Direction</FieldLabel>
                      <SimpleSelect
                        id="longitudeDir"
                        value={formData.longitudeDir}
                        onChange={(v) => updateFieldAndClearInvalid("longitudeDir", v)}
                        options={lonDirOptions}
                        placeholder="Select"
                        invalid={isFieldInvalid("longitudeDir")}
                      />
                    </Field>
                  </div>
                </FieldGroup>
              </FieldSet>
            </FormSection>

            <FormSection title="Equipment Status">
              <FieldSet>
                <FieldGroup>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field data-invalid={isFieldInvalid("binoculars") || undefined}>
                      <FieldLabel htmlFor="binoculars">Binoculars</FieldLabel>
                      <SimpleSelect
                        id="binoculars"
                        value={formData.binoculars}
                        onChange={(v) => updateFieldAndClearInvalid("binoculars", v)}
                        options={completedOptions}
                        placeholder="Select an option"
                        invalid={isFieldInvalid("binoculars")}
                      />
                    </Field>
                    <Field data-invalid={isFieldInvalid("vhfChannel16") || undefined}>
                      <FieldLabel htmlFor="vhfChannel16">VHF on Channel 16</FieldLabel>
                      <SimpleSelect
                        id="vhfChannel16"
                        value={formData.vhfChannel16}
                        onChange={(v) => updateFieldAndClearInvalid("vhfChannel16", v)}
                        options={completedOptions}
                        placeholder="Select an option"
                        invalid={isFieldInvalid("vhfChannel16")}
                      />
                    </Field>
                  </div>
                </FieldGroup>
              </FieldSet>
            </FormSection>

            <FormSection title="Tank Levels">
              <FieldSet>
                <FieldGroup>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Field data-invalid={isFieldInvalid("fuelDayTank") || undefined}>
                      <FieldLabel htmlFor="fuelDayTank">Fuel Day Tank</FieldLabel>
                      <SimpleSelect
                        id="fuelDayTank"
                        value={formData.fuelDayTank}
                        onChange={(v) => updateFieldAndClearInvalid("fuelDayTank", v)}
                        options={tankLevelOptions}
                        placeholder="Select level"
                        invalid={isFieldInvalid("fuelDayTank")}
                      />
                    </Field>
                    <Field data-invalid={isFieldInvalid("grayWaterTank") || undefined}>
                      <FieldLabel htmlFor="grayWaterTank">Gray Water Tank</FieldLabel>
                      <SimpleSelect
                        id="grayWaterTank"
                        value={formData.grayWaterTank}
                        onChange={(v) => updateFieldAndClearInvalid("grayWaterTank", v)}
                        options={tankLevelOptions}
                        placeholder="Select level"
                        invalid={isFieldInvalid("grayWaterTank")}
                      />
                    </Field>
                    <Field data-invalid={isFieldInvalid("blackWaterTank") || undefined}>
                      <FieldLabel htmlFor="blackWaterTank">Black Water Tank</FieldLabel>
                      <SimpleSelect
                        id="blackWaterTank"
                        value={formData.blackWaterTank}
                        onChange={(v) => updateFieldAndClearInvalid("blackWaterTank", v)}
                        options={tankLevelOptions}
                        placeholder="Select level"
                        invalid={isFieldInvalid("blackWaterTank")}
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Field data-invalid={isFieldInvalid("portWaterTank") || undefined}>
                      <LabelWithTooltip htmlFor="portWaterTank" tooltip="Total capacity: 4 units">
                        Port Water Tank
                      </LabelWithTooltip>
                      <SimpleSelect
                        id="portWaterTank"
                        value={formData.portWaterTank}
                        onChange={(v) => updateFieldAndClearInvalid("portWaterTank", v)}
                        options={tankLevelOptions}
                        placeholder="Select level"
                        invalid={isFieldInvalid("portWaterTank")}
                      />
                    </Field>
                    <Field data-invalid={isFieldInvalid("starboardWaterTank") || undefined}>
                      <LabelWithTooltip htmlFor="starboardWaterTank" tooltip="Total capacity: 4 units">
                        Starboard Water Tank
                      </LabelWithTooltip>
                      <SimpleSelect
                        id="starboardWaterTank"
                        value={formData.starboardWaterTank}
                        onChange={(v) => updateFieldAndClearInvalid("starboardWaterTank", v)}
                        options={tankLevelOptions}
                        placeholder="Select level"
                        invalid={isFieldInvalid("starboardWaterTank")}
                      />
                    </Field>
                    <Field data-invalid={isFieldInvalid("chilledWaterTemp") || undefined}>
                      <LabelWithTooltip htmlFor="chilledWaterTemp" tooltip="Valid range: -40 to 80°F">
                        Chilled Water Temp
                      </LabelWithTooltip>
                      <InputGroup className={isFieldInvalid("chilledWaterTemp") ? "[&>input]:border-destructive" : ""}>
                        <InputGroupInput
                          id="chilledWaterTemp"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="-40"
                          max="80"
                          value={formData.chilledWaterTemp}
                          onChange={(e) => updateFieldAndClearInvalid("chilledWaterTemp", e.target.value)}
                          placeholder="-40 to 80"
                          aria-invalid={isFieldInvalid("chilledWaterTemp")}
                          className="h-11 text-base"
                        />
                        <InputGroupAddon align="inline-end">°F</InputGroupAddon>
                      </InputGroup>
                    </Field>
                  </div>
                </FieldGroup>
              </FieldSet>
            </FormSection>

            <FormSection title="Electrical Systems" >
              <FieldSet>
                <FieldGroup>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Field data-invalid={isFieldInvalid("voltageAmpDraw") || undefined}>
                      <LabelWithTooltip htmlFor="voltageAmpDraw" tooltip="Valid range: 0-200 A">
                        Voltage Amp Draw
                      </LabelWithTooltip>
                      <InputGroup className={isFieldInvalid("voltageAmpDraw") ? "[&>input]:border-destructive" : ""}>
                        <InputGroupInput
                          id="voltageAmpDraw"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          max="200"
                          value={formData.voltageAmpDraw}
                          onChange={(e) => updateFieldAndClearInvalid("voltageAmpDraw", e.target.value)}
                          placeholder="0-200"
                          aria-invalid={isFieldInvalid("voltageAmpDraw")}
                          className="h-11 text-base"
                        />
                        <InputGroupAddon align="inline-end">A</InputGroupAddon>
                      </InputGroup>
                    </Field>
                    <Field data-invalid={isFieldInvalid("serviceBatteryVoltage") || undefined}>
                      <LabelWithTooltip htmlFor="serviceBatteryVoltage" tooltip="Valid range: 0-32 V">
                        Service Battery
                      </LabelWithTooltip>
                      <InputGroup className={isFieldInvalid("serviceBatteryVoltage") ? "[&>input]:border-destructive" : ""}>
                        <InputGroupInput
                          id="serviceBatteryVoltage"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          max="32"
                          step="0.1"
                          value={formData.serviceBatteryVoltage}
                          onChange={(e) => updateFieldAndClearInvalid("serviceBatteryVoltage", e.target.value)}
                          placeholder="0-32"
                          aria-invalid={isFieldInvalid("serviceBatteryVoltage")}
                          className="h-11 text-base"
                        />
                        <InputGroupAddon align="inline-end">V</InputGroupAddon>
                      </InputGroup>
                    </Field>
                    <Field data-invalid={isFieldInvalid("electronicsBatteryVoltage") || undefined}>
                      <LabelWithTooltip htmlFor="electronicsBatteryVoltage" tooltip="Valid range: 0-32 V">
                        Electronics Battery
                      </LabelWithTooltip>
                      <InputGroup className={isFieldInvalid("electronicsBatteryVoltage") ? "[&>input]:border-destructive" : ""}>
                        <InputGroupInput
                          id="electronicsBatteryVoltage"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          max="32"
                          step="0.1"
                          value={formData.electronicsBatteryVoltage}
                          onChange={(e) => updateFieldAndClearInvalid("electronicsBatteryVoltage", e.target.value)}
                          placeholder="0-32"
                          aria-invalid={isFieldInvalid("electronicsBatteryVoltage")}
                          className="h-11 text-base"
                        />
                        <InputGroupAddon align="inline-end">V</InputGroupAddon>
                      </InputGroup>
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field data-invalid={isFieldInvalid("engineBatteryVoltage") || undefined}>
                      <LabelWithTooltip htmlFor="engineBatteryVoltage" tooltip="Valid range: 0-32 V">
                        Engine Battery
                      </LabelWithTooltip>
                      <InputGroup className={isFieldInvalid("engineBatteryVoltage") ? "[&>input]:border-destructive" : ""}>
                        <InputGroupInput
                          id="engineBatteryVoltage"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          max="32"
                          step="0.1"
                          value={formData.engineBatteryVoltage}
                          onChange={(e) => updateFieldAndClearInvalid("engineBatteryVoltage", e.target.value)}
                          placeholder="0-32"
                          aria-invalid={isFieldInvalid("engineBatteryVoltage")}
                          className="h-11 text-base"
                        />
                        <InputGroupAddon align="inline-end">V</InputGroupAddon>
                      </InputGroup>
                    </Field>
                    <Field data-invalid={isFieldInvalid("emergencyBatteryVoltage") || undefined}>
                      <LabelWithTooltip htmlFor="emergencyBatteryVoltage" tooltip="Valid range: 0-32 V">
                        Emergency Battery
                      </LabelWithTooltip>
                      <InputGroup className={isFieldInvalid("emergencyBatteryVoltage") ? "[&>input]:border-destructive" : ""}>
                        <InputGroupInput
                          id="emergencyBatteryVoltage"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          max="32"
                          step="0.1"
                          value={formData.emergencyBatteryVoltage}
                          onChange={(e) => updateFieldAndClearInvalid("emergencyBatteryVoltage", e.target.value)}
                          placeholder="0-32"
                          aria-invalid={isFieldInvalid("emergencyBatteryVoltage")}
                          className="h-11 text-base"
                        />
                        <InputGroupAddon align="inline-end">V</InputGroupAddon>
                      </InputGroup>
                    </Field>
                  </div>
                </FieldGroup>
              </FieldSet>
            </FormSection>
          </>
        )}

        {/* Step 3 - Engineering Department */}
        {currentStep === 3 && (
          <>
            <FormSection title="Engineering Area" description="Checks the engine room and machinery systems. Records engine and generator readings to confirm they are operating within safe limits.">
              <FieldSet>
                <FieldGroup>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field data-invalid={isFieldInvalid("mainEngineRpm") || undefined}>
                      <FieldLabel htmlFor="mainEngineRpm">Main Engine RPM</FieldLabel>
                      <InputGroup className={isFieldInvalid("mainEngineRpm") ? "[&>input]:border-destructive" : ""}>
                        <InputGroupInput
                          id="mainEngineRpm"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          value={formData.mainEngineRpm}
                          onChange={(e) => updateFieldAndClearInvalid("mainEngineRpm", e.target.value)}
                          placeholder="Enter RPM"
                          aria-invalid={isFieldInvalid("mainEngineRpm")}
                          className="h-11 text-base"
                        />
                        <InputGroupAddon align="inline-end">RPM</InputGroupAddon>
                      </InputGroup>
                    </Field>
                    <Field data-invalid={isFieldInvalid("mainEngineGearOilPressure") || undefined}>
                      <LabelWithTooltip htmlFor="mainEngineGearOilPressure" tooltip="Valid range: 0-300 psi">
                        Gear Oil Pressure
                      </LabelWithTooltip>
                      <InputGroup className={isFieldInvalid("mainEngineGearOilPressure") ? "[&>input]:border-destructive" : ""}>
                        <InputGroupInput
                          id="mainEngineGearOilPressure"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          max="300"
                          value={formData.mainEngineGearOilPressure}
                          onChange={(e) => updateFieldAndClearInvalid("mainEngineGearOilPressure", e.target.value)}
                          placeholder="0-300"
                          aria-invalid={isFieldInvalid("mainEngineGearOilPressure")}
                          className="h-11 text-base"
                        />
                        <InputGroupAddon align="inline-end">psi</InputGroupAddon>
                      </InputGroup>
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Field data-invalid={isFieldInvalid("mainEngineOilPressure") || undefined}>
                      <LabelWithTooltip htmlFor="mainEngineOilPressure" tooltip="Valid range: 0-300 psi">
                        Oil Pressure
                      </LabelWithTooltip>
                      <InputGroup className={isFieldInvalid("mainEngineOilPressure") ? "[&>input]:border-destructive" : ""}>
                        <InputGroupInput
                          id="mainEngineOilPressure"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          max="300"
                          value={formData.mainEngineOilPressure}
                          onChange={(e) => updateFieldAndClearInvalid("mainEngineOilPressure", e.target.value)}
                          placeholder="0-300"
                          aria-invalid={isFieldInvalid("mainEngineOilPressure")}
                          className="h-11 text-base"
                        />
                        <InputGroupAddon align="inline-end">psi</InputGroupAddon>
                      </InputGroup>
                    </Field>
                    <Field data-invalid={isFieldInvalid("mainEngineTemp") || undefined}>
                      <LabelWithTooltip htmlFor="mainEngineTemp" tooltip="Valid range: 0-260°F">
                        Engine Temp
                      </LabelWithTooltip>
                      <InputGroup className={isFieldInvalid("mainEngineTemp") ? "[&>input]:border-destructive" : ""}>
                        <InputGroupInput
                          id="mainEngineTemp"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          max="260"
                          value={formData.mainEngineTemp}
                          onChange={(e) => updateFieldAndClearInvalid("mainEngineTemp", e.target.value)}
                          placeholder="0-260"
                          aria-invalid={isFieldInvalid("mainEngineTemp")}
                          className="h-11 text-base"
                        />
                        <InputGroupAddon align="inline-end">°F</InputGroupAddon>
                      </InputGroup>
                    </Field>
                    <Field data-invalid={isFieldInvalid("mainEngineValveCoverTemp") || undefined}>
                      <LabelWithTooltip htmlFor="mainEngineValveCoverTemp" tooltip="Valid range: 0-350°F">
                        Valve Cover Temp
                      </LabelWithTooltip>
                      <InputGroup className={isFieldInvalid("mainEngineValveCoverTemp") ? "[&>input]:border-destructive" : ""}>
                        <InputGroupInput
                          id="mainEngineValveCoverTemp"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          max="350"
                          value={formData.mainEngineValveCoverTemp}
                          onChange={(e) => updateFieldAndClearInvalid("mainEngineValveCoverTemp", e.target.value)}
                          placeholder="0-350"
                          aria-invalid={isFieldInvalid("mainEngineValveCoverTemp")}
                          className="h-11 text-base"
                        />
                        <InputGroupAddon align="inline-end">°F</InputGroupAddon>
                      </InputGroup>
                    </Field>
                  </div>
                </FieldGroup>
              </FieldSet>
            </FormSection>

            <FormSection title="Generator" >
              <FieldSet>
                <FieldGroup>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field data-invalid={isFieldInvalid("generatorOilTemp") || undefined}>
                      <LabelWithTooltip htmlFor="generatorOilTemp" tooltip="Valid range: 0-260°F">
                        Generator Oil Temp
                      </LabelWithTooltip>
                      <InputGroup className={isFieldInvalid("generatorOilTemp") ? "[&>input]:border-destructive" : ""}>
                        <InputGroupInput
                          id="generatorOilTemp"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          max="260"
                          value={formData.generatorOilTemp}
                          onChange={(e) => updateFieldAndClearInvalid("generatorOilTemp", e.target.value)}
                          placeholder="0-260"
                          aria-invalid={isFieldInvalid("generatorOilTemp")}
                          className="h-11 text-base"
                        />
                        <InputGroupAddon align="inline-end">°F</InputGroupAddon>
                      </InputGroup>
                    </Field>
                    <Field data-invalid={isFieldInvalid("generatorOilPressure") || undefined}>
                      <LabelWithTooltip htmlFor="generatorOilPressure" tooltip="Valid range: 0-300 psi">
                        Generator Oil Pressure
                      </LabelWithTooltip>
                      <InputGroup className={isFieldInvalid("generatorOilPressure") ? "[&>input]:border-destructive" : ""}>
                        <InputGroupInput
                          id="generatorOilPressure"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          max="300"
                          value={formData.generatorOilPressure}
                          onChange={(e) => updateFieldAndClearInvalid("generatorOilPressure", e.target.value)}
                          placeholder="0-300"
                          aria-invalid={isFieldInvalid("generatorOilPressure")}
                          className="h-11 text-base"
                        />
                        <InputGroupAddon align="inline-end">psi</InputGroupAddon>
                      </InputGroup>
                    </Field>
                  </div>
                </FieldGroup>
              </FieldSet>
            </FormSection>
          </>
        )}

        {/* Step 4 - Deck Department */}
        {currentStep === 4 && (
          <>
            <FormSection title="Deck Area" description="Checks all exterior areas of the vessel. Confirms tenders, fuel cans, anchors, lines, and deck equipment are secured and ready for sea conditions.">
              <FieldSet>
                <FieldGroup>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field data-invalid={isFieldInvalid("catamaranSecure") || undefined}>
                      <FieldLabel htmlFor="catamaranSecure">Catamaran Secure</FieldLabel>
                      <SimpleSelect
                        id="catamaranSecure"
                        value={formData.catamaranSecure}
                        onChange={(v) => updateFieldAndClearInvalid("catamaranSecure", v)}
                        options={secureOptions}
                        placeholder="Select an option"
                        invalid={isFieldInvalid("catamaranSecure")}
                      />
                    </Field>
                    <Field data-invalid={isFieldInvalid("sternRibSecure") || undefined}>
                      <FieldLabel htmlFor="sternRibSecure">Stern RIB Secure</FieldLabel>
                      <SimpleSelect
                        id="sternRibSecure"
                        value={formData.sternRibSecure}
                        onChange={(v) => updateFieldAndClearInvalid("sternRibSecure", v)}
                        options={secureOptions}
                        placeholder="Select an option"
                        invalid={isFieldInvalid("sternRibSecure")}
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field data-invalid={isFieldInvalid("bowRibSecure") || undefined}>
                      <FieldLabel htmlFor="bowRibSecure">Bow RIB Secure</FieldLabel>
                      <SimpleSelect
                        id="bowRibSecure"
                        value={formData.bowRibSecure}
                        onChange={(v) => updateFieldAndClearInvalid("bowRibSecure", v)}
                        options={secureOptions}
                        placeholder="Select an option"
                        invalid={isFieldInvalid("bowRibSecure")}
                      />
                    </Field>
                    <Field data-invalid={isFieldInvalid("fuelCansSecure") || undefined}>
                      <FieldLabel htmlFor="fuelCansSecure">Fuel Cans Secure</FieldLabel>
                      <SimpleSelect
                        id="fuelCansSecure"
                        value={formData.fuelCansSecure}
                        onChange={(v) => updateFieldAndClearInvalid("fuelCansSecure", v)}
                        options={secureOptions}
                        placeholder="Select an option"
                        invalid={isFieldInvalid("fuelCansSecure")}
                      />
                    </Field>
                  </div>
                </FieldGroup>
              </FieldSet>
            </FormSection>

            <FormSection title="Deck Equipment" >
              <FieldSet>
                <FieldGroup>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Field data-invalid={isFieldInvalid("jackLinesSecure") || undefined}>
                      <FieldLabel htmlFor="jackLinesSecure">Jack Lines Secure</FieldLabel>
                      <SimpleSelect
                        id="jackLinesSecure"
                        value={formData.jackLinesSecure}
                        onChange={(v) => updateFieldAndClearInvalid("jackLinesSecure", v)}
                        options={secureOptions}
                        placeholder="Select an option"
                        invalid={isFieldInvalid("jackLinesSecure")}
                      />
                    </Field>
                    <Field data-invalid={isFieldInvalid("anchorsSecure") || undefined}>
                      <FieldLabel htmlFor="anchorsSecure">Anchors Secure</FieldLabel>
                      <SimpleSelect
                        id="anchorsSecure"
                        value={formData.anchorsSecure}
                        onChange={(v) => updateFieldAndClearInvalid("anchorsSecure", v)}
                        options={secureOptions}
                        placeholder="Select an option"
                        invalid={isFieldInvalid("anchorsSecure")}
                      />
                    </Field>
                    <Field data-invalid={isFieldInvalid("sailingLinesClean") || undefined}>
                      <FieldLabel htmlFor="sailingLinesClean">Sailing Lines Coiled</FieldLabel>
                      <SimpleSelect
                        id="sailingLinesClean"
                        value={formData.sailingLinesClean}
                        onChange={(v) => updateFieldAndClearInvalid("sailingLinesClean", v)}
                        options={secureOptions}
                        placeholder="Select an option"
                        invalid={isFieldInvalid("sailingLinesClean")}
                      />
                    </Field>
                  </div>

                  <Field data-invalid={isFieldInvalid("rsCatMastSecure") || undefined}>
                    <FieldLabel htmlFor="rsCatMastSecure">RS Cat Mast Secure to Toe Rail</FieldLabel>
                    <SimpleSelect
                      id="rsCatMastSecure"
                      value={formData.rsCatMastSecure}
                      onChange={(v) => updateFieldAndClearInvalid("rsCatMastSecure", v)}
                      options={secureOptions}
                      placeholder="Select an option"
                      className="md:w-1/2"
                      invalid={isFieldInvalid("rsCatMastSecure")}
                    />
                  </Field>
                </FieldGroup>
              </FieldSet>
            </FormSection>
          </>
        )}

        {/* Step 5 - Interior Department */}
        {currentStep === 5 && (
          <>
            <FormSection title="Interior Area" description="Checks all interior spaces. Confirms items are secured, living areas are safe for vessel movement, and onboard systems are functioning properly.">
              <FieldSet>
                <FieldGroup>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Field data-invalid={isFieldInvalid("salonItemsSecure") || undefined}>
                      <FieldLabel htmlFor="salonItemsSecure">Salon Items Secure</FieldLabel>
                      <SimpleSelect
                        id="salonItemsSecure"
                        value={formData.salonItemsSecure}
                        onChange={(v) => updateFieldAndClearInvalid("salonItemsSecure", v)}
                        options={secureOptions}
                        placeholder="Select an option"
                        invalid={isFieldInvalid("salonItemsSecure")}
                      />
                    </Field>
                    <Field data-invalid={isFieldInvalid("galleyItemsSecure") || undefined}>
                      <FieldLabel htmlFor="galleyItemsSecure">Galley Items Secure</FieldLabel>
                      <SimpleSelect
                        id="galleyItemsSecure"
                        value={formData.galleyItemsSecure}
                        onChange={(v) => updateFieldAndClearInvalid("galleyItemsSecure", v)}
                        options={secureOptions}
                        placeholder="Select an option"
                        invalid={isFieldInvalid("galleyItemsSecure")}
                      />
                    </Field>
                    <Field data-invalid={isFieldInvalid("allCabinItemsSecure") || undefined}>
                      <FieldLabel htmlFor="allCabinItemsSecure">All Cabin Items Secure</FieldLabel>
                      <SimpleSelect
                        id="allCabinItemsSecure"
                        value={formData.allCabinItemsSecure}
                        onChange={(v) => updateFieldAndClearInvalid("allCabinItemsSecure", v)}
                        options={secureOptions}
                        placeholder="Select an option"
                        invalid={isFieldInvalid("allCabinItemsSecure")}
                      />
                    </Field>
                  </div>
                </FieldGroup>
              </FieldSet>
            </FormSection>

            <FormSection title="Refrigeration Systems" description="Records temperatures for all refrigerators and freezers to ensure food safety and proper operation.">
              <FieldSet>
                <FieldGroup>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Field data-invalid={isFieldInvalid("forepeakFreezerTemp") || undefined}>
                      <LabelWithTooltip htmlFor="forepeakFreezerTemp" tooltip="Valid range: -40 to 80°F">
                        Forepeak Freezer
                      </LabelWithTooltip>
                      <InputGroup className={isFieldInvalid("forepeakFreezerTemp") ? "[&>input]:border-destructive" : ""}>
                        <InputGroupInput
                          id="forepeakFreezerTemp"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="-40"
                          max="80"
                          value={formData.forepeakFreezerTemp}
                          onChange={(e) => updateFieldAndClearInvalid("forepeakFreezerTemp", e.target.value)}
                          placeholder="-40 to 80"
                          aria-invalid={isFieldInvalid("forepeakFreezerTemp")}
                          className="h-11 text-base"
                        />
                        <InputGroupAddon align="inline-end">°F</InputGroupAddon>
                      </InputGroup>
                    </Field>
                    <Field data-invalid={isFieldInvalid("salonFridgeTemp") || undefined}>
                      <LabelWithTooltip htmlFor="salonFridgeTemp" tooltip="Valid range: -40 to 80°F">
                        Salon Fridge
                      </LabelWithTooltip>
                      <InputGroup className={isFieldInvalid("salonFridgeTemp") ? "[&>input]:border-destructive" : ""}>
                        <InputGroupInput
                          id="salonFridgeTemp"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="-40"
                          max="80"
                          value={formData.salonFridgeTemp}
                          onChange={(e) => updateFieldAndClearInvalid("salonFridgeTemp", e.target.value)}
                          placeholder="-40 to 80"
                          aria-invalid={isFieldInvalid("salonFridgeTemp")}
                          className="h-11 text-base"
                        />
                        <InputGroupAddon align="inline-end">°F</InputGroupAddon>
                      </InputGroup>
                    </Field>
                    <Field data-invalid={isFieldInvalid("galleyTopFridgeTemp") || undefined}>
                      <LabelWithTooltip htmlFor="galleyTopFridgeTemp" tooltip="Valid range: -40 to 80°F">
                        Galley Top Fridge
                      </LabelWithTooltip>
                      <InputGroup className={isFieldInvalid("galleyTopFridgeTemp") ? "[&>input]:border-destructive" : ""}>
                        <InputGroupInput
                          id="galleyTopFridgeTemp"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="-40"
                          max="80"
                          value={formData.galleyTopFridgeTemp}
                          onChange={(e) => updateFieldAndClearInvalid("galleyTopFridgeTemp", e.target.value)}
                          placeholder="-40 to 80"
                          aria-invalid={isFieldInvalid("galleyTopFridgeTemp")}
                          className="h-11 text-base"
                        />
                        <InputGroupAddon align="inline-end">°F</InputGroupAddon>
                      </InputGroup>
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field data-invalid={isFieldInvalid("galleyBottomFreezerTemp") || undefined}>
                      <LabelWithTooltip htmlFor="galleyBottomFreezerTemp" tooltip="Valid range: -40 to 80°F">
                        Galley Bottom Freezer
                      </LabelWithTooltip>
                      <InputGroup className={isFieldInvalid("galleyBottomFreezerTemp") ? "[&>input]:border-destructive" : ""}>
                        <InputGroupInput
                          id="galleyBottomFreezerTemp"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="-40"
                          max="80"
                          value={formData.galleyBottomFreezerTemp}
                          onChange={(e) => updateFieldAndClearInvalid("galleyBottomFreezerTemp", e.target.value)}
                          placeholder="-40 to 80"
                          aria-invalid={isFieldInvalid("galleyBottomFreezerTemp")}
                          className="h-11 text-base"
                        />
                        <InputGroupAddon align="inline-end">°F</InputGroupAddon>
                      </InputGroup>
                    </Field>
                    <Field data-invalid={isFieldInvalid("lazaretteDeepFreezerTemp") || undefined}>
                      <LabelWithTooltip htmlFor="lazaretteDeepFreezerTemp" tooltip="Valid range: -40 to 80°F">
                        Lazarette Deep Freezer
                      </LabelWithTooltip>
                      <InputGroup className={isFieldInvalid("lazaretteDeepFreezerTemp") ? "[&>input]:border-destructive" : ""}>
                        <InputGroupInput
                          id="lazaretteDeepFreezerTemp"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="-40"
                          max="80"
                          value={formData.lazaretteDeepFreezerTemp}
                          onChange={(e) => updateFieldAndClearInvalid("lazaretteDeepFreezerTemp", e.target.value)}
                          placeholder="-40 to 80"
                          aria-invalid={isFieldInvalid("lazaretteDeepFreezerTemp")}
                          className="h-11 text-base"
                        />
                        <InputGroupAddon align="inline-end">°F</InputGroupAddon>
                      </InputGroup>
                    </Field>
                  </div>
                </FieldGroup>
              </FieldSet>
            </FormSection>

            <FormSection title="Safety Systems" description="Confirms critical safety controls are set correctly, including propane shutoffs and electrical breakers.">
              <FieldSet>
                <FieldGroup>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field data-invalid={isFieldInvalid("propaneSolenoidOff") || undefined}>
                      <FieldLabel htmlFor="propaneSolenoidOff">Propane Solenoid Off</FieldLabel>
                      <SimpleSelect
                        id="propaneSolenoidOff"
                        value={formData.propaneSolenoidOff}
                        onChange={(v) => updateFieldAndClearInvalid("propaneSolenoidOff", v)}
                        options={yesNoOptions}
                        placeholder="Select an option"
                        invalid={isFieldInvalid("propaneSolenoidOff")}
                      />
                    </Field>
                    <Field data-invalid={isFieldInvalid("ovenBreakerOff") || undefined}>
                      <FieldLabel htmlFor="ovenBreakerOff">Oven Breaker Off</FieldLabel>
                      <SimpleSelect
                        id="ovenBreakerOff"
                        value={formData.ovenBreakerOff}
                        onChange={(v) => updateFieldAndClearInvalid("ovenBreakerOff", v)}
                        options={yesNoOptions}
                        placeholder="Select an option"
                        invalid={isFieldInvalid("ovenBreakerOff")}
                      />
                    </Field>
                  </div>
                </FieldGroup>
              </FieldSet>
            </FormSection>
          </>
        )}

        {/* Step 6 - Confirmation */}
        {currentStep === 6 && (
          <FormSection title="Final Review" >
            <FieldSet>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="generalObservations">General Observations (Optional)</FieldLabel>
                  <Textarea
                    id="generalObservations"
                    value={formData.generalObservations}
                    onChange={(e) => updateFieldAndClearInvalid("generalObservations", e.target.value)}
                    placeholder="Write any specific observations or notes here..."
                    rows={5}
                    className="text-base min-h-[120px]"
                  />
                  <FieldDescription>
                    Include any notable conditions, issues, or comments about the passage.
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="additionalNotes">Additional Notes (Optional)</FieldLabel>
                  <Textarea
                    id="additionalNotes"
                    value={formData.additionalNotes}
                    onChange={(e) => updateFieldAndClearInvalid("additionalNotes", e.target.value)}
                    placeholder="Any additional notes, maintenance items, or follow-up actions..."
                    rows={5}
                    className="text-base min-h-[120px]"
                  />
                  <FieldDescription>
                    Document any maintenance needs, follow-up items, or other relevant information.
                  </FieldDescription>
                </Field>

                <Field data-invalid={isFieldInvalid("crewMembers") || undefined}>
                  <FieldLabel>Crew Members</FieldLabel>
                  <Popover open={crewMembersOpen} onOpenChange={setCrewMembersOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={crewMembersOpen}
                        aria-invalid={isFieldInvalid("crewMembers")}
                        className={cn(
                          "w-full justify-between font-normal min-h-[2.75rem] h-auto text-base",
                          isFieldInvalid("crewMembers") && "border-destructive"
                        )}
                      >
                        {formData.crewMembers.filter(Boolean).length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {formData.crewMembers.filter(Boolean).map((name) => (
                              <span key={name} className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded-md text-xs">
                                {name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Select crew members</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
                      <Command>
                        <CommandInput placeholder="Search students..." className="h-11" />
                        <CommandList>
                          <CommandEmpty>No students found.</CommandEmpty>
                          <CommandGroup heading="Students">
                            {students.filter((person) => getFullName(person)).map((person) => {
                              const fullName = getFullName(person)
                              return (
                                <CommandItem
                                  key={`crew-${person.id}`}
                                  value={fullName}
                                  onSelect={() => {
                                    toggleCrewMember(fullName)
                                    // Clear invalid state when a crew member is selected
                                    if (invalidFields.has("crewMembers")) {
                                      setInvalidFields(prev => {
                                        const next = new Set(prev)
                                        next.delete("crewMembers")
                                        return next
                                      })
                                    }
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      formData.crewMembers.includes(fullName) ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-secondary-foreground text-xs font-medium mr-2">
                                    {getInitials(fullName)}
                                  </div>
                                  {fullName}
                                </CommandItem>
                              )
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FieldDescription>
                    Select all students who participated in this passage.
                  </FieldDescription>
                </Field>

                <Field data-invalid={isFieldInvalid("approvedBy") || undefined}>
                  <FieldLabel>Approved and Completed By</FieldLabel>
                  <Popover open={approvedByOpen} onOpenChange={setApprovedByOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={approvedByOpen}
                        aria-invalid={isFieldInvalid("approvedBy")}
                        className={cn(
                          "w-full h-11 justify-between font-normal text-base",
                          isFieldInvalid("approvedBy") && "border-destructive"
                        )}
                      >
                        {formData.approvedBy ? (
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                              {getInitials(formData.approvedBy)}
                            </div>
                            {formData.approvedBy}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Select a staff member</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
                      <Command>
                        <CommandInput placeholder="Search staff..." className="h-11" />
                        <CommandList>
                          <CommandEmpty>No staff found.</CommandEmpty>
                          <CommandGroup>
                            {staff.filter((person) => person.name).map((person) => (
                              <CommandItem
                                key={`staff-${person.id}`}
                                value={person.name}
                                onSelect={(currentValue) => {
                                  updateFieldAndClearInvalid("approvedBy", currentValue === formData.approvedBy ? "" : currentValue)
                                  setApprovedByOpen(false)
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.approvedBy === person.name ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium mr-2">
                                  {getInitials(person.name)}
                                </div>
                                {person.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FieldDescription>
                    Select a staff member to certify this passage log is complete and accurate.
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </FieldSet>
          </FormSection>
        )}

      </div>

      {/* Fixed Footer Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-white dark:bg-gray-800 border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-3 h-[60px] flex items-center">
          <div className="flex gap-2 w-full">
            <Button 
              variant="outline" 
              onClick={handlePrevious} 
              disabled={currentStep === 1}
              className="flex-1 h-10 cursor-pointer disabled:cursor-not-allowed"
            >
              ← Previous
            </Button>
            {currentStep < 6 ? (
              <Button onClick={handleNext} className="flex-1 h-10 cursor-pointer">
                Next →
              </Button>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button disabled={isSubmitting} className="flex-1 h-10 cursor-pointer">
                    {isSubmitting ? "Submitting..." : "Submit Passage Log"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Submit Passage Log?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to submit this passage log? Please review all entries before confirming.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSubmit} className="cursor-pointer">
                      Submit Log
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
