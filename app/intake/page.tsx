"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Spinner } from "@/components/ui/spinner"
import { Check, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react"
import { createExpeditionStudentInformation } from "@/lib/xano"
import { toast } from "sonner"
import { format } from "date-fns"

export default function IntakeFormPage() {
  // Helper function to parse date string to local Date object
  const parseLocalDate = (dateString: string): Date | undefined => {
    if (!dateString) return undefined
    const [year, month, day] = dateString.split('-').map(Number)
    return new Date(year, month - 1, day)
  }
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [currentSection, setCurrentSection] = useState(0)
  const [fieldErrors, setFieldErrors] = useState<Set<string>>(new Set())
  
  const [formData, setFormData] = useState({
    student_name: "",
    date_of_birth: "",
    passport_number: "",
    passport_issued_date: "",
    passport_expiration_date: "",
    passport_photo: "",
    student_shirt_size: "",
    swimming_level: "",
    health_conditions: "",
    medical_history: "",
    allergies: "",
    dietary_restrictions: "",
    other_medical_info: "",
    treatment_goals: "",
    additional_accommodations: "",
    takes_morning_medication: null as boolean | null,
    morning_medication_details: "",
    takes_evening_medication: null as boolean | null,
    evening_medication_details: "",
    takes_additional_medications: null as boolean | null,
    other_medications_details: "",
    behavioral_emotional_conditions: "",
    behavior_management_strategies: "",
    fears_or_anxieties: "",
    separation_concerns: "",
    primary_contact_name: "",
    primary_contact_phone: "",
    primary_contact_email: "",
    emergency_contact_name: "",
    emergency_contact_relationship: "",
    emergency_contact_phone: "",
    emergency_contact_email: "",
    expeditions_id: 0,
  })

  const updateField = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate all sections before submitting
    for (let i = 0; i < sections.length; i++) {
      if (!validateSection(i)) {
        setCurrentSection(i)
        return
      }
    }
    
    setIsSubmitting(true)
    
    try {
      // Format data for API
      const submitData = {
        ...formData,
        passport_number: parseInt(formData.passport_number as string) || 0,
        takes_morning_medication: formData.takes_morning_medication === true,
        takes_evening_medication: formData.takes_evening_medication === true,
        takes_additional_medications: formData.takes_additional_medications === true,
        expeditions_id: formData.expeditions_id || 0,
      }
      
      console.log("Submitting data:", submitData)
      await createExpeditionStudentInformation(submitData)
      setIsSubmitted(true)
      toast.success("Intake form submitted successfully!")
    } catch (error) {
      console.error("Failed to submit form:", error)
      toast.error("Failed to submit form. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const sections = [
    { title: "Student Information", description: "Basic information about the student" },
    { title: "Travel Documents", description: "Passport and travel details" },
    { title: "Health & Medical", description: "Medical history and health conditions" },
    { title: "Medications", description: "Current medications and schedules" },
    { title: "Behavioral Information", description: "Behavioral and emotional considerations" },
    { title: "Emergency Contacts", description: "Primary and emergency contact information" },
  ]

  const validateSection = (sectionIndex: number): boolean => {
    const errors = new Set<string>()
    
    switch (sectionIndex) {
      case 0: // Student Information
        if (!formData.student_name) errors.add("student_name")
        if (!formData.date_of_birth) errors.add("date_of_birth")
        if (!formData.student_shirt_size) errors.add("student_shirt_size")
        if (!formData.swimming_level) errors.add("swimming_level")
        
        if (errors.size > 0) {
          setFieldErrors(errors)
          toast.error("Please complete all required fields")
          return false
        }
        break
      case 1: // Travel Documents - all optional
        break
      case 2: // Health & Medical
        // All optional but recommended
        break
      case 3: // Medications
        if (formData.takes_morning_medication === null) errors.add("takes_morning_medication")
        if (formData.takes_evening_medication === null) errors.add("takes_evening_medication")
        if (formData.takes_additional_medications === null) errors.add("takes_additional_medications")
        
        if (errors.size > 0) {
          setFieldErrors(errors)
          toast.error("Please answer all medication questions")
          return false
        }
        break
      case 4: // Behavioral Information
        // All optional but recommended
        break
      case 5: // Emergency Contacts
        if (!formData.primary_contact_name) errors.add("primary_contact_name")
        if (!formData.primary_contact_phone) errors.add("primary_contact_phone")
        if (!formData.primary_contact_email) errors.add("primary_contact_email")
        if (!formData.emergency_contact_name) errors.add("emergency_contact_name")
        if (!formData.emergency_contact_relationship) errors.add("emergency_contact_relationship")
        if (!formData.emergency_contact_phone) errors.add("emergency_contact_phone")
        if (!formData.emergency_contact_email) errors.add("emergency_contact_email")
        
        if (errors.size > 0) {
          setFieldErrors(errors)
          toast.error("Please complete all required contact fields")
          return false
        }
        break
    }
    
    setFieldErrors(new Set())
    return true
  }

  const nextSection = () => {
    if (validateSection(currentSection)) {
      if (currentSection < sections.length - 1) {
        setCurrentSection(prev => prev + 1)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
  }

  const prevSection = () => {
    if (currentSection > 0) {
      setCurrentSection(prev => prev - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-gray-700" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
          <p className="text-gray-600 mb-6">
            Your intake form has been submitted successfully. Our team will review the information and contact you if we need any additional details.
          </p>
          <Button onClick={() => window.location.reload()} variant="outline" className="cursor-pointer">
            Submit Another Form
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-6 py-6">
          <div className="flex flex-col gap-3">
            <div className="h-12 w-12 rounded-full overflow-hidden flex-shrink-0">
              <Image
                src="/sailfuture-square (8).webp"
                alt="SailFuture Logo"
                width={48}
                height={48}
                className="object-cover"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">SailFuture Expedition Student Information Form</h1>
              <p className="text-gray-500 text-sm mt-1">Complete all fields to ensure your student's health, safety, and support during international sailing expeditions. All information is kept confidential.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Section Header */}
      <div className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">{sections[currentSection].title}</h2>
          <p className="text-gray-500 text-sm mt-0.5">{sections[currentSection].description}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
              Section {currentSection + 1} of {sections.length}
            </span>
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">
              {sections[currentSection].title}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div 
              className="bg-gray-700 h-1 rounded-full transition-all duration-300"
              style={{ width: `${((currentSection + 1) / sections.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 pb-24 bg-gray-50">
        <div className="max-w-2xl mx-auto px-6 py-8">
          <form onSubmit={handleSubmit}>

            {/* Section 0: Student Information */}
            {currentSection === 0 && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="student_name">Student Full Name *</Label>
                  <Input
                    id="student_name"
                    className={`mt-1.5 bg-white ${fieldErrors.has("student_name") ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    value={formData.student_name}
                    onChange={(e) => {
                      updateField("student_name", e.target.value)
                      if (fieldErrors.has("student_name")) {
                        const newErrors = new Set(fieldErrors)
                        newErrors.delete("student_name")
                        setFieldErrors(newErrors)
                      }
                    }}
                    placeholder="Enter student's full name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="date_of_birth">Date of Birth *</Label>
                  <div className="flex gap-2 mt-1.5">
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => {
                        updateField("date_of_birth", e.target.value)
                        if (fieldErrors.has("date_of_birth")) {
                          const newErrors = new Set(fieldErrors)
                          newErrors.delete("date_of_birth")
                          setFieldErrors(newErrors)
                        }
                      }}
                      required
                      className={`flex-1 bg-white ${fieldErrors.has("date_of_birth") ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    />
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          type="button"
                          size="icon"
                          className={`cursor-pointer flex-shrink-0 bg-white h-8 ${fieldErrors.has("date_of_birth") ? "border-red-500" : ""}`}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto overflow-hidden p-0" align="end">
                        <CalendarComponent
                          mode="single"
                          selected={parseLocalDate(formData.date_of_birth)}
                          captionLayout="dropdown-buttons"
                          onSelect={(date) => {
                            if (date) {
                              updateField("date_of_birth", format(date, "yyyy-MM-dd"))
                              if (fieldErrors.has("date_of_birth")) {
                                const newErrors = new Set(fieldErrors)
                                newErrors.delete("date_of_birth")
                                setFieldErrors(newErrors)
                              }
                            }
                          }}
                          fromYear={1990}
                          toYear={new Date().getFullYear()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div>
                  <Label htmlFor="student_shirt_size">Shirt Size *</Label>
                  <Select
                    value={formData.student_shirt_size}
                    onValueChange={(value) => {
                      updateField("student_shirt_size", value)
                      if (fieldErrors.has("student_shirt_size")) {
                        const newErrors = new Set(fieldErrors)
                        newErrors.delete("student_shirt_size")
                        setFieldErrors(newErrors)
                      }
                    }}
                    required
                  >
                    <SelectTrigger className={`w-full mt-1.5 cursor-pointer bg-white ${fieldErrors.has("student_shirt_size") ? "border-red-500 focus:ring-red-500" : ""}`}>
                      <SelectValue placeholder="Select Shirt Size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="XS">XS</SelectItem>
                      <SelectItem value="S">Small</SelectItem>
                      <SelectItem value="M">Medium</SelectItem>
                      <SelectItem value="L">Large</SelectItem>
                      <SelectItem value="XL">XL</SelectItem>
                      <SelectItem value="XXL">XXL</SelectItem>
                      <SelectItem value="XXXL">XXXL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="swimming_level">Swimming Level *</Label>
                  <Select
                    value={formData.swimming_level}
                    onValueChange={(value) => {
                      updateField("swimming_level", value)
                      if (fieldErrors.has("swimming_level")) {
                        const newErrors = new Set(fieldErrors)
                        newErrors.delete("swimming_level")
                        setFieldErrors(newErrors)
                      }
                    }}
                    required
                  >
                    <SelectTrigger className={`w-full mt-1.5 cursor-pointer bg-white ${fieldErrors.has("swimming_level") ? "border-red-500 focus:ring-red-500" : ""}`}>
                      <SelectValue placeholder="Select Swimming Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="None">Cannot Swim</SelectItem>
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                      <SelectItem value="Expert">Expert / Competitive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              </div>
            )}

            {/* Section 1: Travel Documents */}
            {currentSection === 1 && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="passport_number">Passport Number</Label>
                  <Input
                    id="passport_number"
                    className="mt-1.5 bg-white"
                    value={formData.passport_number}
                    onChange={(e) => updateField("passport_number", e.target.value)}
                    placeholder="Enter passport number"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="passport_issued_date">Issue Date</Label>
                    <div className="flex gap-2 mt-1.5">
                      <Input
                        id="passport_issued_date"
                        type="date"
                        value={formData.passport_issued_date}
                        onChange={(e) => updateField("passport_issued_date", e.target.value)}
                        className="flex-1 bg-white"
                      />
                      <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          type="button"
                          size="icon"
                          className="cursor-pointer flex-shrink-0 bg-white h-8"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                        <PopoverContent className="w-auto overflow-hidden p-0" align="end">
                          <CalendarComponent
                            mode="single"
                            selected={parseLocalDate(formData.passport_issued_date)}
                            captionLayout="dropdown-buttons"
                            onSelect={(date) => {
                              if (date) {
                                updateField("passport_issued_date", format(date, "yyyy-MM-dd"))
                              }
                            }}
                            fromYear={2000}
                            toYear={new Date().getFullYear()}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="passport_expiration_date">Expiration Date</Label>
                    <div className="flex gap-2 mt-1.5">
                      <Input
                        id="passport_expiration_date"
                        type="date"
                        value={formData.passport_expiration_date}
                        onChange={(e) => updateField("passport_expiration_date", e.target.value)}
                        className="flex-1 bg-white"
                      />
                      <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          type="button"
                          size="icon"
                          className="cursor-pointer flex-shrink-0 bg-white h-8"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                        <PopoverContent className="w-auto overflow-hidden p-0" align="end">
                          <CalendarComponent
                            mode="single"
                            selected={parseLocalDate(formData.passport_expiration_date)}
                            captionLayout="dropdown-buttons"
                            onSelect={(date) => {
                              if (date) {
                                updateField("passport_expiration_date", format(date, "yyyy-MM-dd"))
                              }
                            }}
                            fromYear={new Date().getFullYear()}
                            toYear={new Date().getFullYear() + 20}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Section 2: Health & Medical */}
            {currentSection === 2 && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="health_conditions">Current Health Conditions</Label>
                  <Textarea
                    id="health_conditions"
                    className="mt-1.5 bg-white"
                    value={formData.health_conditions}
                    onChange={(e) => updateField("health_conditions", e.target.value)}
                    placeholder="List any current health conditions..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="medical_history">Medical History</Label>
                  <Textarea
                    id="medical_history"
                    className="mt-1.5 bg-white"
                    value={formData.medical_history}
                    onChange={(e) => updateField("medical_history", e.target.value)}
                    placeholder="Relevant medical history, surgeries, hospitalizations..."
                    rows={3}
                  />
                </div>

                <hr className="border-gray-200" />

                <div>
                  <Label htmlFor="allergies">Allergies</Label>
                  <Textarea
                    id="allergies"
                    className="mt-1.5 bg-white"
                    value={formData.allergies}
                    onChange={(e) => updateField("allergies", e.target.value)}
                    placeholder="List all known allergies (food, medication, environmental)..."
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="dietary_restrictions">Dietary Restrictions</Label>
                  <Input
                    id="dietary_restrictions"
                    className="mt-1.5 bg-white"
                    value={formData.dietary_restrictions}
                    onChange={(e) => updateField("dietary_restrictions", e.target.value)}
                    placeholder="Vegetarian, vegan, gluten-free, etc."
                  />
                </div>

                <hr className="border-gray-200" />

                <div>
                  <Label htmlFor="other_medical_info">Other Medical Information</Label>
                  <Textarea
                    id="other_medical_info"
                    className="mt-1.5 bg-white"
                    value={formData.other_medical_info}
                    onChange={(e) => updateField("other_medical_info", e.target.value)}
                    placeholder="Any other medical information we should know..."
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="treatment_goals">Treatment Goals</Label>
                  <Textarea
                    id="treatment_goals"
                    className="mt-1.5 bg-white"
                    value={formData.treatment_goals}
                    onChange={(e) => updateField("treatment_goals", e.target.value)}
                    placeholder="Goals for the student during the expedition..."
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="additional_accommodations">Additional Accommodations Needed</Label>
                  <Textarea
                    id="additional_accommodations"
                    className="mt-1.5 bg-white"
                    value={formData.additional_accommodations}
                    onChange={(e) => updateField("additional_accommodations", e.target.value)}
                    placeholder="Any special accommodations required..."
                    rows={2}
                  />
                </div>
              </div>
            )}

            {/* Section 3: Medications */}
            {currentSection === 3 && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="takes_morning_medication">Does the student take morning medication? *</Label>
                  <Select
                    value={formData.takes_morning_medication === null ? "" : (formData.takes_morning_medication ? "Yes" : "No")}
                    onValueChange={(value) => {
                      updateField("takes_morning_medication", value === "Yes")
                      if (fieldErrors.has("takes_morning_medication")) {
                        const newErrors = new Set(fieldErrors)
                        newErrors.delete("takes_morning_medication")
                        setFieldErrors(newErrors)
                      }
                    }}
                    required
                  >
                    <SelectTrigger className={`w-full mt-1.5 cursor-pointer bg-white ${fieldErrors.has("takes_morning_medication") ? "border-red-500 focus:ring-red-500" : ""}`}>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.takes_morning_medication === true && (
                  <div>
                    <Label htmlFor="morning_medication_details">Morning Medication Details</Label>
                    <Textarea
                      id="morning_medication_details"
                      className="mt-1.5 bg-white"
                      value={formData.morning_medication_details}
                      onChange={(e) => updateField("morning_medication_details", e.target.value)}
                      placeholder="Medication name, dosage, time, and instructions..."
                      rows={2}
                    />
                  </div>
                )}

                <hr className="border-gray-200" />

                <div>
                  <Label htmlFor="takes_evening_medication">Does the student take evening medication? *</Label>
                  <Select
                    value={formData.takes_evening_medication === null ? "" : (formData.takes_evening_medication ? "Yes" : "No")}
                    onValueChange={(value) => {
                      updateField("takes_evening_medication", value === "Yes")
                      if (fieldErrors.has("takes_evening_medication")) {
                        const newErrors = new Set(fieldErrors)
                        newErrors.delete("takes_evening_medication")
                        setFieldErrors(newErrors)
                      }
                    }}
                    required
                  >
                    <SelectTrigger className={`w-full mt-1.5 cursor-pointer bg-white ${fieldErrors.has("takes_evening_medication") ? "border-red-500 focus:ring-red-500" : ""}`}>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.takes_evening_medication === true && (
                  <div>
                    <Label htmlFor="evening_medication_details">Evening Medication Details</Label>
                    <Textarea
                      id="evening_medication_details"
                      className="mt-1.5 bg-white"
                      value={formData.evening_medication_details}
                      onChange={(e) => updateField("evening_medication_details", e.target.value)}
                      placeholder="Medication name, dosage, time, and instructions..."
                      rows={2}
                    />
                  </div>
                )}

                <hr className="border-gray-200" />

                <div>
                  <Label htmlFor="takes_additional_medications">Does the student take any other medications? *</Label>
                  <Select
                    value={formData.takes_additional_medications === null ? "" : (formData.takes_additional_medications ? "Yes" : "No")}
                    onValueChange={(value) => {
                      updateField("takes_additional_medications", value === "Yes")
                      if (fieldErrors.has("takes_additional_medications")) {
                        const newErrors = new Set(fieldErrors)
                        newErrors.delete("takes_additional_medications")
                        setFieldErrors(newErrors)
                      }
                    }}
                    required
                  >
                    <SelectTrigger className={`w-full mt-1.5 cursor-pointer bg-white ${fieldErrors.has("takes_additional_medications") ? "border-red-500 focus:ring-red-500" : ""}`}>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.takes_additional_medications === true && (
                  <div>
                    <Label htmlFor="other_medications_details">Other Medication Details</Label>
                    <Textarea
                      id="other_medications_details"
                      className="mt-1.5 bg-white"
                      value={formData.other_medications_details}
                      onChange={(e) => updateField("other_medications_details", e.target.value)}
                      placeholder="Medication name, dosage, time, and instructions..."
                      rows={2}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Section 4: Behavioral Information */}
            {currentSection === 4 && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="behavioral_emotional_conditions">Behavioral or Emotional Conditions</Label>
                  <p className="text-xs text-gray-500 mt-1">Documented or observed behavioral, emotional, or neurological conditions that may impact the student's learning, behavior, or daily functioning.</p>
                  <Textarea
                    id="behavioral_emotional_conditions"
                    className="mt-1.5 bg-white"
                    value={formData.behavioral_emotional_conditions}
                    onChange={(e) => updateField("behavioral_emotional_conditions", e.target.value)}
                    placeholder="ADHD, anxiety, depression, autism spectrum, etc..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="behavior_management_strategies">Behavior Management Strategies</Label>
                  <p className="text-xs text-gray-500 mt-1">Specific approaches, routines, or interventions that have been effective in supporting this student's behavior and self-regulation.</p>
                  <Textarea
                    id="behavior_management_strategies"
                    className="mt-1.5 bg-white"
                    value={formData.behavior_management_strategies}
                    onChange={(e) => updateField("behavior_management_strategies", e.target.value)}
                    placeholder="Strategies that work well for this student..."
                    rows={3}
                  />
                </div>

                <hr className="border-gray-200" />

                <div>
                  <Label htmlFor="fears_or_anxieties">Known Fears or Anxieties</Label>
                  <p className="text-xs text-gray-500 mt-1">Identified fears, triggers, or situations that cause heightened stress, avoidance, or emotional distress for the student.</p>
                  <Textarea
                    id="fears_or_anxieties"
                    className="mt-1.5 bg-white"
                    value={formData.fears_or_anxieties}
                    onChange={(e) => updateField("fears_or_anxieties", e.target.value)}
                    placeholder="Water, heights, enclosed spaces, etc..."
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="separation_concerns">Separation Concerns</Label>
                  <p className="text-xs text-gray-500 mt-1">Any difficulties, stress responses, or behavioral changes related to being away from home, caregivers, or familiar support systems.</p>
                  <Textarea
                    id="separation_concerns"
                    className="mt-1.5 bg-white"
                    value={formData.separation_concerns}
                    onChange={(e) => updateField("separation_concerns", e.target.value)}
                    placeholder="Any concerns about being away from home or family..."
                    rows={2}
                  />
                </div>
              </div>
            )}

            {/* Section 5: Emergency Contacts */}
            {currentSection === 5 && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-4">Primary Contact</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="primary_contact_name">Full Name *</Label>
                      <Input
                        id="primary_contact_name"
                        className={`mt-1.5 bg-white ${fieldErrors.has("primary_contact_name") ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                        value={formData.primary_contact_name}
                        onChange={(e) => {
                          updateField("primary_contact_name", e.target.value)
                          if (fieldErrors.has("primary_contact_name")) {
                            const newErrors = new Set(fieldErrors)
                            newErrors.delete("primary_contact_name")
                            setFieldErrors(newErrors)
                          }
                        }}
                        placeholder="Parent/Guardian name"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="primary_contact_phone">Phone Number *</Label>
                        <Input
                          id="primary_contact_phone"
                          type="tel"
                          className={`mt-1.5 bg-white ${fieldErrors.has("primary_contact_phone") ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                          value={formData.primary_contact_phone}
                          onChange={(e) => {
                            updateField("primary_contact_phone", e.target.value)
                            if (fieldErrors.has("primary_contact_phone")) {
                              const newErrors = new Set(fieldErrors)
                              newErrors.delete("primary_contact_phone")
                              setFieldErrors(newErrors)
                            }
                          }}
                          placeholder="(555) 123-4567"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="primary_contact_email">Email *</Label>
                        <Input
                          id="primary_contact_email"
                          type="email"
                          className={`mt-1.5 bg-white ${fieldErrors.has("primary_contact_email") ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                          value={formData.primary_contact_email}
                          onChange={(e) => {
                            updateField("primary_contact_email", e.target.value)
                            if (fieldErrors.has("primary_contact_email")) {
                              const newErrors = new Set(fieldErrors)
                              newErrors.delete("primary_contact_email")
                              setFieldErrors(newErrors)
                            }
                          }}
                          placeholder="email@example.com"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="border-gray-200" />

                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Emergency Contact</h3>
                  <p className="text-sm text-gray-500 mb-4">Someone other than the primary contact who can be reached in an emergency.</p>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="emergency_contact_name">Full Name *</Label>
                        <Input
                          id="emergency_contact_name"
                          className={`mt-1.5 bg-white ${fieldErrors.has("emergency_contact_name") ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                          value={formData.emergency_contact_name}
                          onChange={(e) => {
                            updateField("emergency_contact_name", e.target.value)
                            if (fieldErrors.has("emergency_contact_name")) {
                              const newErrors = new Set(fieldErrors)
                              newErrors.delete("emergency_contact_name")
                              setFieldErrors(newErrors)
                            }
                          }}
                          placeholder="Emergency contact name"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="emergency_contact_relationship">Relationship *</Label>
                        <Input
                          id="emergency_contact_relationship"
                          className={`mt-1.5 bg-white ${fieldErrors.has("emergency_contact_relationship") ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                          value={formData.emergency_contact_relationship}
                          onChange={(e) => {
                            updateField("emergency_contact_relationship", e.target.value)
                            if (fieldErrors.has("emergency_contact_relationship")) {
                              const newErrors = new Set(fieldErrors)
                              newErrors.delete("emergency_contact_relationship")
                              setFieldErrors(newErrors)
                            }
                          }}
                          placeholder="Aunt, Uncle, Family Friend, etc."
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="emergency_contact_phone">Phone Number *</Label>
                        <Input
                          id="emergency_contact_phone"
                          type="tel"
                          className={`mt-1.5 bg-white ${fieldErrors.has("emergency_contact_phone") ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                          value={formData.emergency_contact_phone}
                          onChange={(e) => {
                            updateField("emergency_contact_phone", e.target.value)
                            if (fieldErrors.has("emergency_contact_phone")) {
                              const newErrors = new Set(fieldErrors)
                              newErrors.delete("emergency_contact_phone")
                              setFieldErrors(newErrors)
                            }
                          }}
                          placeholder="(555) 123-4567"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="emergency_contact_email">Email *</Label>
                        <Input
                          id="emergency_contact_email"
                          type="email"
                          className={`mt-1.5 bg-white ${fieldErrors.has("emergency_contact_email") ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                          value={formData.emergency_contact_email}
                          onChange={(e) => {
                            updateField("emergency_contact_email", e.target.value)
                            if (fieldErrors.has("emergency_contact_email")) {
                              const newErrors = new Set(fieldErrors)
                              newErrors.delete("emergency_contact_email")
                              setFieldErrors(newErrors)
                            }
                          }}
                          placeholder="email@example.com"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Fixed Navigation Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t z-20">
        <div className="max-w-2xl mx-auto px-6 py-4 flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={prevSection}
            disabled={currentSection === 0}
            className="min-w-[100px] cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          
          {currentSection < sections.length - 1 ? (
            <Button type="button" onClick={nextSection} className="min-w-[100px] cursor-pointer">
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button 
              type="submit" 
              disabled={isSubmitting} 
              className="min-w-[140px] cursor-pointer"
              onClick={handleSubmit}
            >
              {isSubmitting ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Submitting...
                </>
              ) : (
                "Submit Form"
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
