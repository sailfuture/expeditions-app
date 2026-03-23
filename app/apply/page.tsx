"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

const STORAGE_KEY = "expedition_application_draft"

const departments = [
  { value: "Deck", label: "Deck" },
  { value: "Galley", label: "Galley" },
  { value: "Interior", label: "Interior" },
  { value: "Engineer", label: "Engineering" },
]

const departmentDetails = [
  {
    name: "Deck Department",
    role: "Deckhand",
    responsibilities: [
      "Perform routine maintenance and cleaning of deck areas",
      "Handle mooring lines and assist with docking and undocking procedures",
      "Manage and store equipment and supplies",
      "Assist with cargo handling and securing",
      "Conduct safety drills and ensure all safety equipment is in working order",
    ],
  },
  {
    name: "Galley Department",
    role: "Cook",
    responsibilities: [
      "Prepare and cook meals for crew and passengers",
      "Plan and manage food inventory, ensuring supplies are stocked and fresh",
      "Maintain a clean and organized galley, adhering to hygiene and safety standards",
      "Coordinate with the interior department to cater to special dietary needs",
      "Assist with meal planning and special events as needed",
    ],
  },
  {
    name: "Interior Department",
    role: "Steward/Stewardess",
    responsibilities: [
      "Maintain cleanliness and orderliness of interior spaces, including cabins and common areas",
      "Provide housekeeping services and manage laundry tasks",
      "Assist passengers with requests and ensure their comfort and satisfaction",
      "Manage inventory of interior supplies and amenities",
      "Coordinate with the galley for meal service and special events",
    ],
  },
  {
    name: "Engineering Department",
    role: "Marine Engineer/Technician",
    responsibilities: [
      "Maintain and repair the vessel's mechanical and electrical systems",
      "Monitor and operate engines, generators, and other machinery",
      "Conduct routine inspections and preventive maintenance",
      "Troubleshoot and resolve mechanical issues as they arise",
      "Ensure compliance with safety and environmental regulations",
    ],
  },
]


interface FormData {
  firstChoiceDepartment: string
  whyFirstChoiceDepartment: string
  secondChoiceDepartment: string
  whySecondChoiceDepartment: string
  careerGoalsOrInterests: string
  relevantExperienceOrSkills: string
  professionalTraits: string
  conflictResolutionExample: string
  problemSolvingApproach: string
  perseveranceOrResilienceExample: string
  resumeLink: string
}

const initialFormData: FormData = {
  firstChoiceDepartment: "",
  whyFirstChoiceDepartment: "",
  secondChoiceDepartment: "",
  whySecondChoiceDepartment: "",
  careerGoalsOrInterests: "",
  relevantExperienceOrSkills: "",
  professionalTraits: "",
  conflictResolutionExample: "",
  problemSolvingApproach: "",
  perseveranceOrResilienceExample: "",
  resumeLink: "",
}

export default function ApplyPage() {
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Load saved data on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setFormData(parsed.formData || initialFormData)
        if (parsed.savedAt) {
          setLastSaved(new Date(parsed.savedAt))
        }
      } catch {
        // Invalid data, ignore
      }
    }
  }, [])

  // Auto-save with debounce
  const saveToStorage = useCallback((data: FormData) => {
    setIsSaving(true)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      formData: data,
      savedAt: new Date().toISOString(),
    }))
    setLastSaved(new Date())
    setTimeout(() => setIsSaving(false), 500)
  }, [])

  // Debounced save effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (Object.values(formData).some(v => v)) {
        saveToStorage(formData)
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [formData, saveToStorage])

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    if (!formData.firstChoiceDepartment) {
      toast.error("Please select your first choice department")
      return
    }
    if (!formData.secondChoiceDepartment) {
      toast.error("Please select your second choice department")
      return
    }
    if (formData.firstChoiceDepartment === formData.secondChoiceDepartment) {
      toast.error("First and second choice departments must be different")
      return
    }

    const requiredFields: (keyof FormData)[] = [
      "whyFirstChoiceDepartment",
      "whySecondChoiceDepartment",
      "careerGoalsOrInterests",
      "relevantExperienceOrSkills",
      "professionalTraits",
      "conflictResolutionExample",
      "problemSolvingApproach",
      "perseveranceOrResilienceExample",
    ]

    for (const field of requiredFields) {
      if (!formData[field]?.trim()) {
        toast.error("Please fill in all required fields")
        return
      }
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("https://xsc3-mvx7-r86m.n7e.xano.io/api:bXFdqx8y/expedition_student_applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error("Failed to submit application")
      }

      // Clear saved data
      localStorage.removeItem(STORAGE_KEY)
      setIsSubmitted(true)
      toast.success("Application submitted successfully!")
    } catch (error) {
      console.error("Failed to submit:", error)
      toast.error("Failed to submit application. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-white">
        {/* Top Nav */}
        <div className="border-b">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
            <img 
              src="/sailfuture-square (8).webp" 
              alt="SailFuture" 
              className="w-8 h-8 rounded-full object-cover"
            />
            <span className="text-sm font-medium text-gray-900">SailFuture Expeditions</span>
          </div>
        </div>
        <div className="flex items-center justify-center p-4 min-h-[calc(100vh-57px)]">
          <div className="max-w-lg text-center">
            <h1 className="text-2xl font-semibold text-gray-900 mb-4">Application Submitted</h1>
            <p className="text-gray-600 mb-6">
              Thank you for your interest in joining the Whatever It Takes crew. We will review your application and be in touch soon.
            </p>
            <p className="text-sm text-gray-500">SailFuture Expeditions</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Top Nav */}
      <div className="sticky top-0 z-50 bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/sailfuture-square (8).webp" 
              alt="SailFuture" 
              className="w-8 h-8 rounded-full object-cover"
            />
            <span className="text-sm font-medium text-gray-900">SailFuture Expeditions</span>
          </div>
          <div className="text-xs">
            {isSaving ? (
              <span className="text-gray-400">Saving...</span>
            ) : lastSaved ? (
              <span className="px-2 py-1 rounded bg-green-50 text-green-600 border border-green-100">Draft saved</span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="border-b">
        <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-3">
            Whatever It Takes Crew Application
          </h1>
          <p className="text-gray-600">
            As a crew member on Sailing Yacht Whatever It Takes you will have the opportunity to work in one of five departments including the Bridge, Deck, Galley, Interior, and Engineering. Your role will ensure the smooth operation and maintenance of the vessel.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Department Descriptions */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Department Descriptions</h2>
          <div className="space-y-6">
            {departmentDetails.map((dept) => (
              <div key={dept.name} className="border-b pb-6 last:border-0">
                <h3 className="font-medium text-gray-900">{dept.name}</h3>
                <p className="text-sm text-gray-500 mb-3">Role: {dept.role}</p>
                <ul className="space-y-1">
                  {dept.responsibilities.map((resp, i) => (
                    <li key={i} className="text-sm text-gray-600 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-gray-400">
                      {resp}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Divider */}
        <hr className="my-10" />

        {/* Application Form */}
        <form onSubmit={handleSubmit}>
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Application</h2>

          <div className="space-y-6">
            {/* Department Selection */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstChoice" className="text-sm font-medium text-gray-700">
                  First Choice Department <span className="text-gray-400">*</span>
                </Label>
                <Select
                  value={formData.firstChoiceDepartment}
                  onValueChange={(value) => handleChange("firstChoiceDepartment", value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent className="w-[var(--radix-select-trigger-width)]">
                    {departments.map((dept) => (
                      <SelectItem 
                        key={dept.value} 
                        value={dept.value}
                        disabled={dept.value === formData.secondChoiceDepartment}
                      >
                        {dept.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondChoice" className="text-sm font-medium text-gray-700">
                  Second Choice Department <span className="text-gray-400">*</span>
                </Label>
                <Select
                  value={formData.secondChoiceDepartment}
                  onValueChange={(value) => handleChange("secondChoiceDepartment", value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent className="w-[var(--radix-select-trigger-width)]">
                    {departments.map((dept) => (
                      <SelectItem 
                        key={dept.value} 
                        value={dept.value}
                        disabled={dept.value === formData.firstChoiceDepartment}
                      >
                        {dept.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Why First Choice */}
            <div className="space-y-2">
              <Label htmlFor="whyFirst" className="text-sm font-medium text-gray-700">
                Why do you want to work in the department chosen as your 1st choice? <span className="text-gray-400">*</span>
              </Label>
              <Textarea
                id="whyFirst"
                value={formData.whyFirstChoiceDepartment}
                onChange={(e) => handleChange("whyFirstChoiceDepartment", e.target.value)}
                placeholder="Your response..."
                className="min-h-[100px] resize-none"
              />
            </div>

            {/* Why Second Choice */}
            <div className="space-y-2">
              <Label htmlFor="whySecond" className="text-sm font-medium text-gray-700">
                Why do you want to work in the department chosen as your 2nd choice? <span className="text-gray-400">*</span>
              </Label>
              <Textarea
                id="whySecond"
                value={formData.whySecondChoiceDepartment}
                onChange={(e) => handleChange("whySecondChoiceDepartment", e.target.value)}
                placeholder="Your response..."
                className="min-h-[100px] resize-none"
              />
            </div>

            {/* Career Goals */}
            <div className="space-y-2">
              <Label htmlFor="careerGoals" className="text-sm font-medium text-gray-700">
                What are your current career goals or interests? <span className="text-gray-400">*</span>
              </Label>
              <Textarea
                id="careerGoals"
                value={formData.careerGoalsOrInterests}
                onChange={(e) => handleChange("careerGoalsOrInterests", e.target.value)}
                placeholder="Your response..."
                className="min-h-[100px] resize-none"
              />
            </div>

            {/* Relevant Experience */}
            <div className="space-y-2">
              <Label htmlFor="experience" className="text-sm font-medium text-gray-700">
                Please describe any relevant experiences or skills that prepare you for success in this role. <span className="text-gray-400">*</span>
              </Label>
              <Textarea
                id="experience"
                value={formData.relevantExperienceOrSkills}
                onChange={(e) => handleChange("relevantExperienceOrSkills", e.target.value)}
                placeholder="Your response..."
                className="min-h-[100px] resize-none"
              />
            </div>

            {/* Professional Traits */}
            <div className="space-y-2">
              <Label htmlFor="traits" className="text-sm font-medium text-gray-700">
                What traits and/or qualities do you think are most important as a working professional? <span className="text-gray-400">*</span>
              </Label>
              <Textarea
                id="traits"
                value={formData.professionalTraits}
                onChange={(e) => handleChange("professionalTraits", e.target.value)}
                placeholder="Your response..."
                className="min-h-[100px] resize-none"
              />
            </div>

            {/* Conflict Resolution */}
            <div className="space-y-2">
              <Label htmlFor="conflict" className="text-sm font-medium text-gray-700">
                Please describe a time that you were involved in conflict with peers or colleagues and how you resolved the issue. <span className="text-gray-400">*</span>
              </Label>
              <Textarea
                id="conflict"
                value={formData.conflictResolutionExample}
                onChange={(e) => handleChange("conflictResolutionExample", e.target.value)}
                placeholder="Your response..."
                className="min-h-[100px] resize-none"
              />
            </div>

            {/* Problem Solving */}
            <div className="space-y-2">
              <Label htmlFor="problemSolving" className="text-sm font-medium text-gray-700">
                Please describe your approach to problem solving and list examples. <span className="text-gray-400">*</span>
              </Label>
              <Textarea
                id="problemSolving"
                value={formData.problemSolvingApproach}
                onChange={(e) => handleChange("problemSolvingApproach", e.target.value)}
                placeholder="Your response..."
                className="min-h-[100px] resize-none"
              />
            </div>

            {/* Perseverance */}
            <div className="space-y-2">
              <Label htmlFor="perseverance" className="text-sm font-medium text-gray-700">
                Please describe a time when you displayed perseverance and/or resilience. <span className="text-gray-400">*</span>
              </Label>
              <Textarea
                id="perseverance"
                value={formData.perseveranceOrResilienceExample}
                onChange={(e) => handleChange("perseveranceOrResilienceExample", e.target.value)}
                placeholder="Your response..."
                className="min-h-[100px] resize-none"
              />
            </div>

            {/* Resume Link (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="resume" className="text-sm font-medium text-gray-700">
                Resume Link <span className="text-gray-400">(Optional)</span>
              </Label>
              <Input
                id="resume"
                type="url"
                value={formData.resumeLink}
                onChange={(e) => handleChange("resumeLink", e.target.value)}
                placeholder="https://..."
              />
              <p className="text-xs text-gray-500">Link to your resume (Google Drive, Dropbox, etc.)</p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-8 pt-6 border-t">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full cursor-pointer"
            >
              {isSubmitting ? "Submitting..." : "Submit Application"}
            </Button>
            <p className="text-center text-xs text-gray-500 mt-3">
              Your progress is automatically saved as you type
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="text-center mt-12 pt-6 border-t text-sm text-gray-500">
          <p>SailFuture Academy</p>
        </div>
      </div>
    </div>
  )
}
