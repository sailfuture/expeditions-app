// Xano API client
const XANO_BASE_URL = "https://xsc3-mvx7-r86m.n7e.xano.io/api:bXFdqx8y"

async function xanoFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${XANO_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  })

  if (!res.ok) {
    // Return empty array for date-specific endpoints that don't exist
    if (res.status === 500 && endpoint.includes('_date?date=')) {
      console.warn(`No data found for endpoint: ${endpoint}`)
      return [] as T
    }
    throw new Error(`Xano API error: ${res.status} ${res.statusText}`)
  }

  return res.json()
}

// ============ Expeditions ============
export async function getExpeditions() {
  return xanoFetch<any[]>("/expeditions")
}

export async function getActiveExpedition() {
  const result = await xanoFetch<any[]>("/active_expedition")
  return result[0] || null
}

// ============ Expedition Schedules ============
export async function getExpeditionSchedules(expeditionsId?: number) {
  const url = expeditionsId 
    ? `/expedition_schedule?expeditions_id=${expeditionsId}`
    : "/expedition_schedule"
  return xanoFetch<any[]>(url)
}

export async function getExpeditionScheduleById(id: number) {
  return xanoFetch<any>(`/expedition_schedule/${id}`)
}

export async function updateExpeditionSchedule(id: number, data: Record<string, any>) {
  return xanoFetch<any>(`/expedition_schedule/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export async function deleteExpeditionSchedule(id: number) {
  return xanoFetch<any>(`/expedition_schedule/${id}`, {
    method: "DELETE",
  })
}

export async function createExpeditionSchedule(data: Record<string, any>) {
  return xanoFetch<any>("/expedition_schedule", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function addAllDatesForExpedition(expeditionsId: number) {
  return xanoFetch<any>(`/add_all_dates?expedition_id=${expeditionsId}`, {
    method: "GET",
  })
}

// ============ Expedition Schedule Items ============
export async function getExpeditionScheduleItems() {
  return xanoFetch<any[]>("/expedition_schedule_items")
}

export async function getExpeditionScheduleItemById(id: number) {
  return xanoFetch<any>(`/expedition_schedule_items/${id}`)
}

export async function getExpeditionScheduleItemsByDate(date: string, expeditionsId?: number) {
  const url = expeditionsId 
    ? `/expedition_schedule_items_date?date=${date}&expeditions_id=${expeditionsId}`
    : `/expedition_schedule_items_date?date=${date}`
  try {
    const response = await xanoFetch<{ out: string; expedition_schedule_items: any[] } | any[]>(url)
    // Handle both object response and empty array (from 500 error handling)
    if (Array.isArray(response)) {
      return response
    }
    return response.expedition_schedule_items || []
  } catch (error) {
    console.error("Error fetching schedule items by date:", error)
    return []
  }
}

export async function createExpeditionScheduleItem(data: Record<string, any>) {
  return xanoFetch<any>("/expedition_schedule_items", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateExpeditionScheduleItem(id: number, data: Record<string, any>) {
  return xanoFetch<any>(`/expedition_schedule_items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export async function deleteExpeditionScheduleItem(id: number) {
  return xanoFetch<any>(`/expedition_schedule_items/${id}`, {
    method: "DELETE",
  })
}

// ============ Expedition Schedule Item Types ============
export async function getExpeditionScheduleItemTypes() {
  return xanoFetch<any[]>("/expedition_schedule_item_types")
}

// ============ Students ============
export async function getStudents() {
  return xanoFetch<any[]>("/students")
}

export async function getStudentById(id: number) {
  return xanoFetch<any>(`/students/${id}`)
}

export async function getStudentsByExpedition(expeditionsId: number) {
  return xanoFetch<any[]>(`/students_by_expedition?expeditions_id=${expeditionsId}`)
}

export async function createExpeditionStudentInformation(data: Record<string, any>) {
  return xanoFetch<any>("/expeditions_student_information", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

// ============ Teachers (Staff) ============
export async function getTeachers() {
  return xanoFetch<any[]>("/teachers")
}

export async function getTeachersByExpedition(expeditionsId: number) {
  return xanoFetch<any[]>(`/teachers_by_expedition?expeditions_id=${expeditionsId}`)
}

export async function getTeacherById(id: number) {
  return xanoFetch<any>(`/teachers/${id}`)
}

// ============ Expeditions Professionalism ============
export async function getExpeditionsProfessionalism() {
  return xanoFetch<any[]>("/expeditions_professionalism")
}

export async function getExpeditionsProfessionalismById(id: number) {
  return xanoFetch<any>(`/expeditions_professionalism/${id}`)
}

export async function getExpeditionsProfessionalismByDate(date: string, expeditionsId: number) {
  return xanoFetch<any[]>(`/expeditions_professionalism_by_date?date=${date}&expeditions_id=${expeditionsId}`)
}

export async function addStudentsToProfessionalism(date: string, expeditionsId: number) {
  return xanoFetch<any>(`/add_students_to_professionalism?date=${date}&expeditions_id=${expeditionsId}`)
}

export async function createExpeditionsProfessionalism(data: Record<string, any>) {
  return xanoFetch<any>("/expeditions_professionalism", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateExpeditionsProfessionalism(id: number, data: Record<string, any>) {
  return xanoFetch<any>(`/expeditions_professionalism/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export async function editExpeditionsProfessionalism(id: number) {
  return xanoFetch<any>(`/expeditions_professionalism/edit`, {
    method: "POST",
    body: JSON.stringify({ expeditions_professionalism_id: id }),
  })
}

export async function getStudentProfessionalismByExpedition(studentsId: number, expeditionsId: number) {
  return xanoFetch<any[]>(`/expeditions_professionalism?students_id=${studentsId}&expeditions_id=${expeditionsId}`)
}

// ============ Student Evaluation Summary ============
export async function getEvaluationByStudent(studentsId: number, expeditionsId: number) {
  return xanoFetch<any>(`/evaluation_by_student?students_id=${studentsId}&expeditions_id=${expeditionsId}`)
}

export async function getEvaluationByStudentAll(studentsId: number, expeditionsId: number) {
  return xanoFetch<any[]>(`/evaluation_by_student_all?students_id=${studentsId}&expeditions_id=${expeditionsId}`)
}

export async function getEvaluationByStudentType(studentsId: number, expeditionsId: number, type: string) {
  return xanoFetch<any[]>(`/get_expedition_professionalism?students_id=${studentsId}&expeditions_id=${expeditionsId}&type=${type}`)
}

export async function getProfessionalismByStudent(studentsId: number, expeditionsId: number) {
  return xanoFetch<any[]>(`/expeditions_professionalism_by_student?students_id=${studentsId}&expeditions_id=${expeditionsId}`)
}

export async function calculateStudentEvaluation(studentsId: number, expeditionsId: number) {
  return xanoFetch<any>("/calculate_student_evaluation", {
    method: "POST",
    body: JSON.stringify({
      students_id: studentsId,
      expeditions_id: expeditionsId,
    }),
  })
}

export async function getExpeditionPerformanceReviews(expeditionsId: number) {
  return xanoFetch<any[]>(`/expedition_performance_reviews?expeditions_id=${expeditionsId}`)
}

export async function getProfessionalismByStudentAndDate(
  studentsId: number,
  expeditionsId: number,
  startDate: string,
  endDate: string
) {
  return xanoFetch<any[]>(
    `/expeditions_professionalism_by_student_and_date?students_id=${studentsId}&expeditions_id=${expeditionsId}&startDate=${startDate}&endDate=${endDate}`
  )
}

export async function createPerformanceReview(data: {
  expeditions_id: number
  report_name: string
  startDate: string
  endDate: string
}) {
  return xanoFetch<any>("/calculate_student_evaluation_performance_evaluation", {
    method: "POST",
    body: JSON.stringify({
      expeditions_id: data.expeditions_id,
      students_id: 0,
      report_name: data.report_name,
      startDate: data.startDate,
      endDate: data.endDate,
    }),
  })
}

export async function getPerformanceReviewById(reviewId: number) {
  return xanoFetch<any>(`/expedition_performance_reviews/${reviewId}`)
}

export async function updatePerformanceReviewNotes(id: number, notes: string) {
  return xanoFetch<any>(`/expedition_performance_reviews/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ notes }),
  })
}

export async function deletePerformanceReview(id: number) {
  return xanoFetch<any>(`/expedition_performance_reviews/${id}`, {
    method: "DELETE",
  })
}

// ============ Bonus Options ============
export async function getExpeditionBonus() {
  return xanoFetch<any[]>("/expedition_bonus")
}

// ============ Penalty Options ============
export async function getExpeditionPenalty() {
  return xanoFetch<any[]>("/expedition_penalty")
}

// ============ Journal Status Options ============
export async function getExpeditionJournalStatus() {
  return xanoFetch<any[]>("/expedition_journal_status")
}

// ============ Locations ============
export async function getExpeditionLocations(expeditionsId?: number) {
  const url = expeditionsId 
    ? `/expedition_locations?expeditions_id=${expeditionsId}`
    : "/expedition_locations"
  return xanoFetch<any[]>(url)
}

// ============ Schedule Templates ============
export async function getExpeditionScheduleTemplates() {
  return xanoFetch<any[]>("/expeditions_schedule_templates")
}

export async function addExpeditionScheduleTemplate(date: string, templateId: number) {
  return xanoFetch<any>(`/add_expedition_schedule_template?date=${date}&expeditions_schedule_templates_id=${templateId}`, {
    method: "GET",
  })
}

// ============ School Management ============
export async function getSchoolTerms() {
  return xanoFetch<any[]>("/schoolterms")
}

export async function getSchoolYears() {
  return xanoFetch<any[]>("/schoolyears")
}

// ============ Expedition Management ============
export async function createExpedition(data: {
  name: string
  startDate: string
  endDate: string
  schoolterms_id: number
  schoolyears_id: number
}) {
  return xanoFetch<any>("/expeditions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
}

export async function updateExpedition(id: number, data: {
  expeditions_id?: number
  name?: string
  startDate?: string
  endDate?: string
  schoolterms_id?: number
  schoolyears_id?: number
  isActive?: boolean
}) {
  return xanoFetch<any>(`/expeditions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      expeditions_id: id,
      ...data,
    }),
  })
}

// ============ Student Management ============
export async function updateStudent(id: number, data: any) {
  return xanoFetch<any>(`/students/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
}

// ============ Dish Days Management ============
export async function getExpeditionDishDays() {
  return xanoFetch<any[]>("/expedition_dish_days")
}

// ============ Intake Form Management ============
export async function getExpeditionsStudentInformation() {
  return xanoFetch<any[]>("/expeditions_student_information")
}

export async function getExpeditionsStudentInformationById(id: number) {
  return xanoFetch<any>(`/expeditions_student_information/${id}`)
}

export async function updateExpeditionsStudentInformation(id: number, data: Record<string, any>) {
  return xanoFetch<any>(`/expeditions_student_information/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export async function deleteExpeditionsStudentInformation(id: number) {
  return xanoFetch<any>(`/expeditions_student_information/${id}`, {
    method: "DELETE",
  })
}

// ============ Staff Management ============
export async function updateTeacher(id: number, data: any) {
  return xanoFetch<any>(`/teachers/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
}

// ============ Discipline Management ============
export async function getExpeditionDiscipline(expeditionsId?: number) {
  const url = expeditionsId 
    ? `/expedition_discipline?expeditions_id=${expeditionsId}`
    : "/expedition_discipline"
  return xanoFetch<any[]>(url)
}

export async function getExpeditionDisciplineById(id: number) {
  return xanoFetch<any>(`/expedition_discipline/${id}`)
}

export async function createExpeditionDiscipline(data: {
  expeditions_id: number
  students_id: number
  date: string
  isReferral: boolean
  reason: string
  summary_of_incident: string
  consequence: string
  expedition_staff_id: number
  action_taken: string
}) {
  return xanoFetch<any>("/expedition_discipline", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateExpeditionDiscipline(id: number, data: Record<string, any>) {
  return xanoFetch<any>(`/expedition_discipline/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export async function deleteExpeditionDiscipline(id: number) {
  return xanoFetch<any>(`/expedition_discipline/${id}`, {
    method: "DELETE",
  })
}

// ============ Staff Validation ============
export async function validateStaffByEmail(email: string) {
  try {
    const res = await fetch(`${XANO_BASE_URL}/validate_staff?email=${encodeURIComponent(email)}`)
    if (!res.ok) {
      return null
    }
    return res.json()
  } catch (error) {
    console.error("Error validating staff:", error)
    return null
  }
}