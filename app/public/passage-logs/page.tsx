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

// Simple native select component for reliability on mobile/iPad
interface SimpleSelectProps {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  id?: string
  className?: string
}

function SimpleSelect({ value, onChange, options, placeholder = "Select an option", id, className }: SimpleSelectProps) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "dark:bg-input/30 dark:hover:bg-input/50",
        "cursor-pointer appearance-none bg-no-repeat bg-right pr-8",
        "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23888%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')]",
        "bg-[length:1rem] bg-[right_0.5rem_center]",
        !value && "text-muted-foreground",
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

  const handleNext = () => {
    if (currentStep < 6) setCurrentStep(currentStep + 1)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleSubmit = async () => {
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
                    <Field>
                      <FieldLabel htmlFor="date-picker">Date</FieldLabel>
                      <Popover open={dateOpen} onOpenChange={setDateOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            id="date-picker"
                            className="w-full justify-between font-normal"
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
                              updateField("date", date)
                              setDateOpen(false)
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </Field>
                    <Field>
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
                            updateField("time", `${val}:${mins}`)
                          }}
                          placeholder="HH"
                          className="flex-1 text-center"
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
                            updateField("time", `${hrs}:${val}`)
                          }}
                          placeholder="MM"
                          className="flex-1 text-center"
                        />
                      </div>
                      <FieldDescription>Enter time in 24-hour format (00:00 - 23:59)</FieldDescription>
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field>
                      <FieldLabel>Departure Location</FieldLabel>
                      <Popover open={departureOpen} onOpenChange={setDepartureOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={departureOpen}
                            className="w-full justify-between font-normal cursor-pointer"
                          >
                            {formData.departureLocation ? (
                              formData.departureLocation
                            ) : (
                              <span className="text-muted-foreground">Select An Option</span>
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
                          <Command>
                            <CommandInput placeholder="Search location..." />
                            <CommandList>
                              <CommandEmpty>No location found.</CommandEmpty>
                              <CommandGroup>
                                {locations.map((location) => (
                                  <CommandItem
                                    key={location.id}
                                    value={`${location.port}, ${location.country}`}
                                    onSelect={(currentValue) => {
                                      updateField("departureLocation", currentValue === formData.departureLocation ? "" : currentValue)
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
                    <Field>
                      <FieldLabel>Destination Location</FieldLabel>
                      <Popover open={destinationOpen} onOpenChange={setDestinationOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={destinationOpen}
                            className="w-full justify-between font-normal cursor-pointer"
                          >
                            {formData.destinationLocation ? (
                              formData.destinationLocation
                            ) : (
                              <span className="text-muted-foreground">Select An Option</span>
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
                          <Command>
                            <CommandInput placeholder="Search location..." />
                            <CommandList>
                              <CommandEmpty>No location found.</CommandEmpty>
                              <CommandGroup>
                                {locations.map((location) => (
                                  <CommandItem
                                    key={location.id}
                                    value={`${location.port}, ${location.country}`}
                                    onSelect={(currentValue) => {
                                      updateField("destinationLocation", currentValue === formData.destinationLocation ? "" : currentValue)
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
                    <Field>
                      <LabelWithTooltip htmlFor="windSpeed" tooltip="Valid range: 0-80 knots">
                        Wind Speed
                      </LabelWithTooltip>
                      <InputGroup>
                        <InputGroupInput
                          id="windSpeed"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          max="80"
                          step="0.1"
                          value={formData.windSpeed}
                          onChange={(e) => updateField("windSpeed", e.target.value)}
                          placeholder="0-80"
                        />
                        <InputGroupAddon align="inline-end">kns</InputGroupAddon>
                      </InputGroup>
                    </Field>
                    <Field>
                      <LabelWithTooltip htmlFor="windDirection" tooltip="Valid range: 0-359 degrees">
                        Wind Direction
                      </LabelWithTooltip>
                      <InputGroup>
                        <InputGroupInput
                          id="windDirection"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          max="359"
                          value={formData.windDirection}
                          onChange={(e) => updateField("windDirection", e.target.value)}
                          placeholder="0-359"
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
                    <Field>
                      <LabelWithTooltip htmlFor="boatSpeed" tooltip="Valid range: 0-40 knots">
                        Boat Speed
                      </LabelWithTooltip>
                      <InputGroup>
                        <InputGroupInput
                          id="boatSpeed"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          max="40"
                          step="0.1"
                          value={formData.boatSpeed}
                          onChange={(e) => updateField("boatSpeed", e.target.value)}
                          placeholder="0-40"
                        />
                        <InputGroupAddon align="inline-end">kns</InputGroupAddon>
                      </InputGroup>
                    </Field>
                    <Field>
                      <LabelWithTooltip htmlFor="heading" tooltip="Valid range: 0-359 degrees">
                        Heading
                      </LabelWithTooltip>
                      <InputGroup>
                        <InputGroupInput
                          id="heading"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          max="359"
                          value={formData.heading}
                          onChange={(e) => updateField("heading", e.target.value)}
                          placeholder="0-359"
                        />
                        <InputGroupAddon align="inline-end">deg</InputGroupAddon>
                      </InputGroup>
                    </Field>
                    <Field>
                      <LabelWithTooltip htmlFor="courseOverGround" tooltip="Valid range: 0-359 degrees">
                        Course Over Ground
                      </LabelWithTooltip>
                      <InputGroup>
                        <InputGroupInput
                          id="courseOverGround"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          max="359"
                          value={formData.courseOverGround}
                          onChange={(e) => updateField("courseOverGround", e.target.value)}
                          placeholder="0-359"
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
                    <Field>
                      <FieldLabel htmlFor="logbookEntry">Logbook Entry</FieldLabel>
                      <SimpleSelect
                        id="logbookEntry"
                        value={formData.logbookEntry}
                        onChange={(v) => updateField("logbookEntry", v)}
                        options={completedOptions}
                        placeholder="Select an option"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="plotPosition">Plot Position on Chart</FieldLabel>
                      <SimpleSelect
                        id="plotPosition"
                        value={formData.plotPosition}
                        onChange={(v) => updateField("plotPosition", v)}
                        options={completedOptions}
                        placeholder="Select an option"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="spotlightCharged">Spotlight Charged</FieldLabel>
                      <SimpleSelect
                        id="spotlightCharged"
                        value={formData.spotlightCharged}
                        onChange={(v) => updateField("spotlightCharged", v)}
                        options={completedOptions}
                        placeholder="Select an option"
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
                    <Field>
                      <LabelWithTooltip htmlFor="latitudeDeg" tooltip="Degrees: 0-90">
                        Degrees (°)
                      </LabelWithTooltip>
                      <InputGroup>
                        <InputGroupInput
                          id="latitudeDeg"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          max="90"
                          value={formData.latitudeDeg}
                          onChange={(e) => updateField("latitudeDeg", e.target.value)}
                          placeholder="0-90"
                        />
                        <InputGroupAddon align="inline-end">°</InputGroupAddon>
                      </InputGroup>
                    </Field>
                    <Field>
                      <LabelWithTooltip htmlFor="latitudeMin" tooltip="Minutes: 0-59">
                        Minutes (&apos;)
                      </LabelWithTooltip>
                      <InputGroup>
                        <InputGroupInput
                          id="latitudeMin"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          max="59"
                          value={formData.latitudeMin}
                          onChange={(e) => updateField("latitudeMin", e.target.value)}
                          placeholder="0-59"
                        />
                        <InputGroupAddon align="inline-end">&apos;</InputGroupAddon>
                      </InputGroup>
                    </Field>
                    <Field>
                      <LabelWithTooltip htmlFor="latitudeSec" tooltip="Seconds: 0-59">
                        Seconds (&quot;)
                      </LabelWithTooltip>
                      <InputGroup>
                        <InputGroupInput
                          id="latitudeSec"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          max="59"
                          value={formData.latitudeSec}
                          onChange={(e) => updateField("latitudeSec", e.target.value)}
                          placeholder="0-59"
                        />
                        <InputGroupAddon align="inline-end">&quot;</InputGroupAddon>
                      </InputGroup>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="latitudeDir">Direction</FieldLabel>
                      <SimpleSelect
                        id="latitudeDir"
                        value={formData.latitudeDir}
                        onChange={(v) => updateField("latitudeDir", v)}
                        options={latDirOptions}
                        placeholder="Select"
                      />
                    </Field>
                  </div>

                  <FieldLegend variant="label">Longitude</FieldLegend>
                  <div className="grid grid-cols-4 gap-4">
                    <Field>
                      <LabelWithTooltip htmlFor="longitudeDeg" tooltip="Degrees: 0-180">
                        Degrees (°)
                      </LabelWithTooltip>
                      <InputGroup>
                        <InputGroupInput
                          id="longitudeDeg"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          max="180"
                          value={formData.longitudeDeg}
                          onChange={(e) => updateField("longitudeDeg", e.target.value)}
                          placeholder="0-180"
                        />
                        <InputGroupAddon align="inline-end">°</InputGroupAddon>
                      </InputGroup>
                    </Field>
                    <Field>
                      <LabelWithTooltip htmlFor="longitudeMin" tooltip="Minutes: 0-59">
                        Minutes (&apos;)
                      </LabelWithTooltip>
                      <InputGroup>
                        <InputGroupInput
                          id="longitudeMin"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          max="59"
                          value={formData.longitudeMin}
                          onChange={(e) => updateField("longitudeMin", e.target.value)}
                          placeholder="0-59"
                        />
                        <InputGroupAddon align="inline-end">&apos;</InputGroupAddon>
                      </InputGroup>
                    </Field>
                    <Field>
                      <LabelWithTooltip htmlFor="longitudeSec" tooltip="Seconds: 0-59">
                        Seconds (&quot;)
                      </LabelWithTooltip>
                      <InputGroup>
                        <InputGroupInput
                          id="longitudeSec"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          max="59"
                          value={formData.longitudeSec}
                          onChange={(e) => updateField("longitudeSec", e.target.value)}
                          placeholder="0-59"
                        />
                        <InputGroupAddon align="inline-end">&quot;</InputGroupAddon>
                      </InputGroup>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="longitudeDir">Direction</FieldLabel>
                      <SimpleSelect
                        id="longitudeDir"
                        value={formData.longitudeDir}
                        onChange={(v) => updateField("longitudeDir", v)}
                        options={lonDirOptions}
                        placeholder="Select"
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
                    <Field>
                      <FieldLabel htmlFor="binoculars">Binoculars</FieldLabel>
                      <SimpleSelect
                        id="binoculars"
                        value={formData.binoculars}
                        onChange={(v) => updateField("binoculars", v)}
                        options={completedOptions}
                        placeholder="Select an option"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="vhfChannel16">VHF on Channel 16</FieldLabel>
                      <SimpleSelect
                        id="vhfChannel16"
                        value={formData.vhfChannel16}
                        onChange={(v) => updateField("vhfChannel16", v)}
                        options={completedOptions}
                        placeholder="Select an option"
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
                    <Field>
                      <FieldLabel htmlFor="fuelDayTank">Fuel Day Tank</FieldLabel>
                      <SimpleSelect
                        id="fuelDayTank"
                        value={formData.fuelDayTank}
                        onChange={(v) => updateField("fuelDayTank", v)}
                        options={tankLevelOptions}
                        placeholder="Select level"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="grayWaterTank">Gray Water Tank</FieldLabel>
                      <SimpleSelect
                        id="grayWaterTank"
                        value={formData.grayWaterTank}
                        onChange={(v) => updateField("grayWaterTank", v)}
                        options={tankLevelOptions}
                        placeholder="Select level"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="blackWaterTank">Black Water Tank</FieldLabel>
                      <SimpleSelect
                        id="blackWaterTank"
                        value={formData.blackWaterTank}
                        onChange={(v) => updateField("blackWaterTank", v)}
                        options={tankLevelOptions}
                        placeholder="Select level"
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Field>
                      <LabelWithTooltip htmlFor="portWaterTank" tooltip="Total capacity: 4 units">
                        Port Water Tank
                      </LabelWithTooltip>
                      <SimpleSelect
                        id="portWaterTank"
                        value={formData.portWaterTank}
                        onChange={(v) => updateField("portWaterTank", v)}
                        options={tankLevelOptions}
                        placeholder="Select level"
                      />
                    </Field>
                    <Field>
                      <LabelWithTooltip htmlFor="starboardWaterTank" tooltip="Total capacity: 4 units">
                        Starboard Water Tank
                      </LabelWithTooltip>
                      <SimpleSelect
                        id="starboardWaterTank"
                        value={formData.starboardWaterTank}
                        onChange={(v) => updateField("starboardWaterTank", v)}
                        options={tankLevelOptions}
                        placeholder="Select level"
                      />
                    </Field>
                    <Field>
                      <LabelWithTooltip htmlFor="chilledWaterTemp" tooltip="Valid range: -40 to 80°F">
                        Chilled Water Temp
                      </LabelWithTooltip>
                      <InputGroup>
                        <InputGroupInput
                          id="chilledWaterTemp"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="-40"
                          max="80"
                          value={formData.chilledWaterTemp}
                          onChange={(e) => updateField("chilledWaterTemp", e.target.value)}
                          placeholder="-40 to 80"
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
                    <Field>
                      <LabelWithTooltip htmlFor="voltageAmpDraw" tooltip="Valid range: 0-200 A">
                        Voltage Amp Draw
                      </LabelWithTooltip>
                      <InputGroup>
                        <InputGroupInput
                          id="voltageAmpDraw"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          max="200"
                          value={formData.voltageAmpDraw}
                          onChange={(e) => updateField("voltageAmpDraw", e.target.value)}
                          placeholder="0-200"
                        />
                        <InputGroupAddon align="inline-end">A</InputGroupAddon>
                      </InputGroup>
                    </Field>
                    <Field>
                      <LabelWithTooltip htmlFor="serviceBatteryVoltage" tooltip="Valid range: 0-32 V">
                        Service Battery
                      </LabelWithTooltip>
                      <InputGroup>
                        <InputGroupInput
                          id="serviceBatteryVoltage"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          max="32"
                          step="0.1"
                          value={formData.serviceBatteryVoltage}
                          onChange={(e) => updateField("serviceBatteryVoltage", e.target.value)}
                          placeholder="0-32"
                        />
                        <InputGroupAddon align="inline-end">V</InputGroupAddon>
                      </InputGroup>
                    </Field>
                    <Field>
                      <LabelWithTooltip htmlFor="electronicsBatteryVoltage" tooltip="Valid range: 0-32 V">
                        Electronics Battery
                      </LabelWithTooltip>
                      <InputGroup>
                        <InputGroupInput
                          id="electronicsBatteryVoltage"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          max="32"
                          step="0.1"
                          value={formData.electronicsBatteryVoltage}
                          onChange={(e) => updateField("electronicsBatteryVoltage", e.target.value)}
                          placeholder="0-32"
                        />
                        <InputGroupAddon align="inline-end">V</InputGroupAddon>
                      </InputGroup>
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field>
                      <LabelWithTooltip htmlFor="engineBatteryVoltage" tooltip="Valid range: 0-32 V">
                        Engine Battery
                      </LabelWithTooltip>
                      <InputGroup>
                        <InputGroupInput
                          id="engineBatteryVoltage"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          max="32"
                          step="0.1"
                          value={formData.engineBatteryVoltage}
                          onChange={(e) => updateField("engineBatteryVoltage", e.target.value)}
                          placeholder="0-32"
                        />
                        <InputGroupAddon align="inline-end">V</InputGroupAddon>
                      </InputGroup>
                    </Field>
                    <Field>
                      <LabelWithTooltip htmlFor="emergencyBatteryVoltage" tooltip="Valid range: 0-32 V">
                        Emergency Battery
                      </LabelWithTooltip>
                      <InputGroup>
                        <InputGroupInput
                          id="emergencyBatteryVoltage"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          max="32"
                          step="0.1"
                          value={formData.emergencyBatteryVoltage}
                          onChange={(e) => updateField("emergencyBatteryVoltage", e.target.value)}
                          placeholder="0-32"
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
                    <Field>
                      <FieldLabel htmlFor="mainEngineRpm">Main Engine RPM</FieldLabel>
                      <InputGroup>
                        <InputGroupInput
                          id="mainEngineRpm"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          value={formData.mainEngineRpm}
                          onChange={(e) => updateField("mainEngineRpm", e.target.value)}
                          placeholder="Enter RPM"
                        />
                        <InputGroupAddon align="inline-end">RPM</InputGroupAddon>
                      </InputGroup>
                    </Field>
                    <Field>
                      <LabelWithTooltip htmlFor="mainEngineGearOilPressure" tooltip="Valid range: 0-300 psi">
                        Gear Oil Pressure
                      </LabelWithTooltip>
                      <InputGroup>
                        <InputGroupInput
                          id="mainEngineGearOilPressure"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          max="300"
                          value={formData.mainEngineGearOilPressure}
                          onChange={(e) => updateField("mainEngineGearOilPressure", e.target.value)}
                          placeholder="0-300"
                        />
                        <InputGroupAddon align="inline-end">psi</InputGroupAddon>
                      </InputGroup>
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Field>
                      <LabelWithTooltip htmlFor="mainEngineOilPressure" tooltip="Valid range: 0-300 psi">
                        Oil Pressure
                      </LabelWithTooltip>
                      <InputGroup>
                        <InputGroupInput
                          id="mainEngineOilPressure"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          max="300"
                          value={formData.mainEngineOilPressure}
                          onChange={(e) => updateField("mainEngineOilPressure", e.target.value)}
                          placeholder="0-300"
                        />
                        <InputGroupAddon align="inline-end">psi</InputGroupAddon>
                      </InputGroup>
                    </Field>
                    <Field>
                      <LabelWithTooltip htmlFor="mainEngineTemp" tooltip="Valid range: 0-260°F">
                        Engine Temp
                      </LabelWithTooltip>
                      <InputGroup>
                        <InputGroupInput
                          id="mainEngineTemp"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          max="260"
                          value={formData.mainEngineTemp}
                          onChange={(e) => updateField("mainEngineTemp", e.target.value)}
                          placeholder="0-260"
                        />
                        <InputGroupAddon align="inline-end">°F</InputGroupAddon>
                      </InputGroup>
                    </Field>
                    <Field>
                      <LabelWithTooltip htmlFor="mainEngineValveCoverTemp" tooltip="Valid range: 0-350°F">
                        Valve Cover Temp
                      </LabelWithTooltip>
                      <InputGroup>
                        <InputGroupInput
                          id="mainEngineValveCoverTemp"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          max="350"
                          value={formData.mainEngineValveCoverTemp}
                          onChange={(e) => updateField("mainEngineValveCoverTemp", e.target.value)}
                          placeholder="0-350"
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
                    <Field>
                      <LabelWithTooltip htmlFor="generatorOilTemp" tooltip="Valid range: 0-260°F">
                        Generator Oil Temp
                      </LabelWithTooltip>
                      <InputGroup>
                        <InputGroupInput
                          id="generatorOilTemp"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          max="260"
                          value={formData.generatorOilTemp}
                          onChange={(e) => updateField("generatorOilTemp", e.target.value)}
                          placeholder="0-260"
                        />
                        <InputGroupAddon align="inline-end">°F</InputGroupAddon>
                      </InputGroup>
                    </Field>
                    <Field>
                      <LabelWithTooltip htmlFor="generatorOilPressure" tooltip="Valid range: 0-300 psi">
                        Generator Oil Pressure
                      </LabelWithTooltip>
                      <InputGroup>
                        <InputGroupInput
                          id="generatorOilPressure"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="0"
                          max="300"
                          value={formData.generatorOilPressure}
                          onChange={(e) => updateField("generatorOilPressure", e.target.value)}
                          placeholder="0-300"
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
                    <Field>
                      <FieldLabel htmlFor="catamaranSecure">Catamaran Secure</FieldLabel>
                      <SimpleSelect
                        id="catamaranSecure"
                        value={formData.catamaranSecure}
                        onChange={(v) => updateField("catamaranSecure", v)}
                        options={secureOptions}
                        placeholder="Select an option"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="sternRibSecure">Stern RIB Secure</FieldLabel>
                      <SimpleSelect
                        id="sternRibSecure"
                        value={formData.sternRibSecure}
                        onChange={(v) => updateField("sternRibSecure", v)}
                        options={secureOptions}
                        placeholder="Select an option"
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field>
                      <FieldLabel htmlFor="bowRibSecure">Bow RIB Secure</FieldLabel>
                      <SimpleSelect
                        id="bowRibSecure"
                        value={formData.bowRibSecure}
                        onChange={(v) => updateField("bowRibSecure", v)}
                        options={secureOptions}
                        placeholder="Select an option"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="fuelCansSecure">Fuel Cans Secure</FieldLabel>
                      <SimpleSelect
                        id="fuelCansSecure"
                        value={formData.fuelCansSecure}
                        onChange={(v) => updateField("fuelCansSecure", v)}
                        options={secureOptions}
                        placeholder="Select an option"
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
                    <Field>
                      <FieldLabel htmlFor="jackLinesSecure">Jack Lines Secure</FieldLabel>
                      <SimpleSelect
                        id="jackLinesSecure"
                        value={formData.jackLinesSecure}
                        onChange={(v) => updateField("jackLinesSecure", v)}
                        options={secureOptions}
                        placeholder="Select an option"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="anchorsSecure">Anchors Secure</FieldLabel>
                      <SimpleSelect
                        id="anchorsSecure"
                        value={formData.anchorsSecure}
                        onChange={(v) => updateField("anchorsSecure", v)}
                        options={secureOptions}
                        placeholder="Select an option"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="sailingLinesClean">Sailing Lines Coiled</FieldLabel>
                      <SimpleSelect
                        id="sailingLinesClean"
                        value={formData.sailingLinesClean}
                        onChange={(v) => updateField("sailingLinesClean", v)}
                        options={secureOptions}
                        placeholder="Select an option"
                      />
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel htmlFor="rsCatMastSecure">RS Cat Mast Secure to Toe Rail</FieldLabel>
                    <SimpleSelect
                      id="rsCatMastSecure"
                      value={formData.rsCatMastSecure}
                      onChange={(v) => updateField("rsCatMastSecure", v)}
                      options={secureOptions}
                      placeholder="Select an option"
                      className="md:w-1/2"
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
                    <Field>
                      <FieldLabel htmlFor="salonItemsSecure">Salon Items Secure</FieldLabel>
                      <SimpleSelect
                        id="salonItemsSecure"
                        value={formData.salonItemsSecure}
                        onChange={(v) => updateField("salonItemsSecure", v)}
                        options={secureOptions}
                        placeholder="Select an option"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="galleyItemsSecure">Galley Items Secure</FieldLabel>
                      <SimpleSelect
                        id="galleyItemsSecure"
                        value={formData.galleyItemsSecure}
                        onChange={(v) => updateField("galleyItemsSecure", v)}
                        options={secureOptions}
                        placeholder="Select an option"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="allCabinItemsSecure">All Cabin Items Secure</FieldLabel>
                      <SimpleSelect
                        id="allCabinItemsSecure"
                        value={formData.allCabinItemsSecure}
                        onChange={(v) => updateField("allCabinItemsSecure", v)}
                        options={secureOptions}
                        placeholder="Select an option"
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
                    <Field>
                      <LabelWithTooltip htmlFor="forepeakFreezerTemp" tooltip="Valid range: -40 to 80°F">
                        Forepeak Freezer
                      </LabelWithTooltip>
                      <InputGroup>
                        <InputGroupInput
                          id="forepeakFreezerTemp"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="-40"
                          max="80"
                          value={formData.forepeakFreezerTemp}
                          onChange={(e) => updateField("forepeakFreezerTemp", e.target.value)}
                          placeholder="-40 to 80"
                        />
                        <InputGroupAddon align="inline-end">°F</InputGroupAddon>
                      </InputGroup>
                    </Field>
                    <Field>
                      <LabelWithTooltip htmlFor="salonFridgeTemp" tooltip="Valid range: -40 to 80°F">
                        Salon Fridge
                      </LabelWithTooltip>
                      <InputGroup>
                        <InputGroupInput
                          id="salonFridgeTemp"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="-40"
                          max="80"
                          value={formData.salonFridgeTemp}
                          onChange={(e) => updateField("salonFridgeTemp", e.target.value)}
                          placeholder="-40 to 80"
                        />
                        <InputGroupAddon align="inline-end">°F</InputGroupAddon>
                      </InputGroup>
                    </Field>
                    <Field>
                      <LabelWithTooltip htmlFor="galleyTopFridgeTemp" tooltip="Valid range: -40 to 80°F">
                        Galley Top Fridge
                      </LabelWithTooltip>
                      <InputGroup>
                        <InputGroupInput
                          id="galleyTopFridgeTemp"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="-40"
                          max="80"
                          value={formData.galleyTopFridgeTemp}
                          onChange={(e) => updateField("galleyTopFridgeTemp", e.target.value)}
                          placeholder="-40 to 80"
                        />
                        <InputGroupAddon align="inline-end">°F</InputGroupAddon>
                      </InputGroup>
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field>
                      <LabelWithTooltip htmlFor="galleyBottomFreezerTemp" tooltip="Valid range: -40 to 80°F">
                        Galley Bottom Freezer
                      </LabelWithTooltip>
                      <InputGroup>
                        <InputGroupInput
                          id="galleyBottomFreezerTemp"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="-40"
                          max="80"
                          value={formData.galleyBottomFreezerTemp}
                          onChange={(e) => updateField("galleyBottomFreezerTemp", e.target.value)}
                          placeholder="-40 to 80"
                        />
                        <InputGroupAddon align="inline-end">°F</InputGroupAddon>
                      </InputGroup>
                    </Field>
                    <Field>
                      <LabelWithTooltip htmlFor="lazaretteDeepFreezerTemp" tooltip="Valid range: -40 to 80°F">
                        Lazarette Deep Freezer
                      </LabelWithTooltip>
                      <InputGroup>
                        <InputGroupInput
                          id="lazaretteDeepFreezerTemp"
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          min="-40"
                          max="80"
                          value={formData.lazaretteDeepFreezerTemp}
                          onChange={(e) => updateField("lazaretteDeepFreezerTemp", e.target.value)}
                          placeholder="-40 to 80"
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
                    <Field>
                      <FieldLabel htmlFor="propaneSolenoidOff">Propane Solenoid Off</FieldLabel>
                      <SimpleSelect
                        id="propaneSolenoidOff"
                        value={formData.propaneSolenoidOff}
                        onChange={(v) => updateField("propaneSolenoidOff", v)}
                        options={yesNoOptions}
                        placeholder="Select an option"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="ovenBreakerOff">Oven Breaker Off</FieldLabel>
                      <SimpleSelect
                        id="ovenBreakerOff"
                        value={formData.ovenBreakerOff}
                        onChange={(v) => updateField("ovenBreakerOff", v)}
                        options={yesNoOptions}
                        placeholder="Select an option"
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
                  <FieldLabel htmlFor="generalObservations">General Observations</FieldLabel>
                  <Textarea
                    id="generalObservations"
                    value={formData.generalObservations}
                    onChange={(e) => updateField("generalObservations", e.target.value)}
                    placeholder="Write any specific observations or notes here..."
                    rows={5}
                  />
                  <FieldDescription>
                    Include any notable conditions, issues, or comments about the passage.
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="additionalNotes">Additional Notes</FieldLabel>
                  <Textarea
                    id="additionalNotes"
                    value={formData.additionalNotes}
                    onChange={(e) => updateField("additionalNotes", e.target.value)}
                    placeholder="Any additional notes, maintenance items, or follow-up actions..."
                    rows={5}
                  />
                  <FieldDescription>
                    Document any maintenance needs, follow-up items, or other relevant information.
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel>Crew Members</FieldLabel>
                  <Popover open={crewMembersOpen} onOpenChange={setCrewMembersOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={crewMembersOpen}
                        className="w-full justify-between font-normal min-h-[2.5rem] h-auto"
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
                        <CommandInput placeholder="Search students..." />
                        <CommandList>
                          <CommandEmpty>No students found.</CommandEmpty>
                          <CommandGroup heading="Students">
                            {students.filter((person) => getFullName(person)).map((person) => {
                              const fullName = getFullName(person)
                              return (
                                <CommandItem
                                  key={`crew-${person.id}`}
                                  value={fullName}
                                  onSelect={() => toggleCrewMember(fullName)}
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

                <Field>
                  <FieldLabel>Approved and Completed By</FieldLabel>
                  <Popover open={approvedByOpen} onOpenChange={setApprovedByOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={approvedByOpen}
                        className="w-full justify-between font-normal"
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
                        <CommandInput placeholder="Search staff..." />
                        <CommandList>
                          <CommandEmpty>No staff found.</CommandEmpty>
                          <CommandGroup>
                            {staff.filter((person) => person.name).map((person) => (
                              <CommandItem
                                key={`staff-${person.id}`}
                                value={person.name}
                                onSelect={(currentValue) => {
                                  updateField("approvedBy", currentValue === formData.approvedBy ? "" : currentValue)
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
