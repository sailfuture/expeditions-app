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
    const response = await xanoFetch<{ out: string; expedition_schedule_items: any[]; expedition?: any[] } | any[]>(url)
    // Handle both object response and empty array (from 500 error handling)
    if (Array.isArray(response)) {
      return { items: response, schedule: null }
    }
    // Return both items and the schedule data (which includes expanded _expedition_dish_days and _expeditions_galley_team)
    const schedule = response.expedition?.[0] || null
    return { 
      items: response.expedition_schedule_items || [], 
      schedule 
    }
  } catch (error) {
    console.error("Error fetching schedule items by date:", error)
    return { items: [], schedule: null }
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

export async function updatePerformanceReviewNotes(id: number, notes: string, expedition_staff_id?: number) {
  const data: any = { notes }
  if (expedition_staff_id !== undefined) {
    data.expedition_staff_id = expedition_staff_id
  }
  return xanoFetch<any>(`/expedition_performance_reviews/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
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

export async function createExpeditionScheduleTemplate(templateName: string, itemIds: number[]) {
  return xanoFetch<any>("/expeditions_schedule_templates", {
    method: "POST",
    body: JSON.stringify({
      template_name: templateName,
      expedition_schedule_items_id: itemIds,
    }),
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
export async function getExpeditionDishDays(expeditionsId?: number) {
  if (expeditionsId) {
    const allDishDays = await xanoFetch<any[]>("/expedition_dish_days")
    return allDishDays.filter((d: any) => d.expeditions_id === expeditionsId)
  }
  return xanoFetch<any[]>("/expedition_dish_days")
}

export async function updateExpeditionDishDay(id: number, data: {
  wash?: number[]
  dry?: number[]
  support?: number
  supervisor?: number
}) {
  return xanoFetch<any>(`/expedition_dish_days/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

// ============ Galley Team Management ============
export async function getExpeditionsGalleyTeam(expeditionsId?: number) {
  const url = expeditionsId 
    ? `/expeditions_galley_team?expeditions_id=${expeditionsId}`
    : "/expeditions_galley_team"
  return xanoFetch<any[]>(url)
}

export async function updateExpeditionsGalleyTeam(id: number, data: {
  students_id?: number[]
  expedition_staff_id?: number
}) {
  return xanoFetch<any>(`/expeditions_galley_team/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export async function createExpeditionsGalleyTeam(data: {
  name: string
  expeditions_id: number
  students_id?: number[]
  expedition_staff_id?: number
}) {
  return xanoFetch<any>("/expeditions_galley_team", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function deleteExpeditionsGalleyTeam(id: number) {
  return xanoFetch<any>(`/expeditions_galley_team/${id}`, {
    method: "DELETE",
  })
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
export async function createTeacher(data: {
  name: string
  role?: string
  expeditions_id?: number[]
}) {
  return xanoFetch<any>("/teachers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
}

export async function updateTeacher(id: number, data: any) {
  return xanoFetch<any>(`/teachers/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
}

// ============ Laptops Management ============
export async function getExpeditionLaptops() {
  return xanoFetch<any[]>("/expedition_laptops")
}

// ============ Rooms Management ============
export async function getExpeditionsRooms() {
  return xanoFetch<any[]>("/expeditions_rooms")
}

// ============ Expedition Assignments ============
export async function createExpeditionAssignment(data: {
  expedition_staff_id?: number
  students_id?: number
  expeditions_id: number
  department?: string
  dish_day?: string
  laptop?: string
  bunk?: string
}) {
  return xanoFetch<any>("/expedition_student_assignments", {
    method: "POST",
    body: JSON.stringify({
      expedition_staff_id: data.expedition_staff_id || 0,
      students_id: data.students_id || 0,
      expeditions_id: data.expeditions_id,
      department: data.department || "",
      dish_day: data.dish_day || "",
      laptop: data.laptop || "",
      bunk: data.bunk || "",
    }),
  })
}

export async function getExpeditionAssignments() {
  return xanoFetch<any[]>("/expedition_student_assignments")
}

export async function getExpeditionAssignmentsByExpedition(expeditionsId: number) {
  const allAssignments = await xanoFetch<any[]>("/expedition_student_assignments")
  return allAssignments.filter((a: any) => a.expeditions_id === expeditionsId)
}

export async function updateExpeditionAssignment(id: number, data: {
  expedition_staff_id?: number
  students_id?: number
  expeditions_id?: number
  expedition_departments_id?: number[]
  dish_day?: string | null
  laptop?: string | null
  bunk?: string | null
  isArchived?: boolean
}) {
  return xanoFetch<any>(`/expedition_student_assignments/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      expedition_student_assignments_id: id,
      ...data,
    }),
  })
}

export async function deleteExpeditionAssignment(id: number) {
  return xanoFetch<any>(`/expedition_student_assignments/${id}`, {
    method: "DELETE",
  })
}


// ============ Locations Management ============
export async function createExpeditionLocation(data: {
  port: string
  country: string
  lat: number
  long: number
  expeditions_id: number
  timezone: string
}) {
  return xanoFetch<any>("/expedition_locations", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateExpeditionLocation(id: number, data: Partial<{
  port: string
  country: string
  lat: number
  long: number
  expeditions_id: number
  timezone: string
}>) {
  return xanoFetch<any>(`/expedition_locations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export async function deleteExpeditionLocation(id: number) {
  return xanoFetch<any>(`/expedition_locations/${id}`, {
    method: "DELETE",
  })
}

// ============ Discipline Management ============
export async function getExpeditionDiscipline(expeditionsId: number) {
  return xanoFetch<any[]>(`/expedition_discipline?expeditions_id=${expeditionsId}`)
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

// ============ Cookbook / Recipes ============
export async function getExpeditionCookbook() {
  return xanoFetch<any[]>("/expedition_cookbook")
}

export async function getExpeditionCookbookByType(type: string) {
  return xanoFetch<any[]>(`/expedition_cookbook_by_type?type=${encodeURIComponent(type)}`)
}

export async function getExpeditionCookbookById(id: number) {
  return xanoFetch<any>(`/expedition_cookbook/${id}`)
}

export async function getIndividualRecipe(cookbookId: number) {
  return xanoFetch<any[]>(`/individual_recipe?expedition_cookbook_id=${cookbookId}`)
}

// ============ Expedition Ingredient Types ============
export async function getExpeditionsIngredientTypes() {
  return xanoFetch<any[]>("/expeditions_ingredient_types")
}

// ============ Expedition Inventory Locations ============
export async function getExpeditionInventoryLocations() {
  return xanoFetch<any[]>("/expedition_inventory_locations")
}

// ============ Expedition Departments ============
export async function getExpeditionDepartments() {
  return xanoFetch<any[]>("/expedition_departments")
}

// ============ Passage Logs ============
export async function getExpeditionPassageLogs() {
  return xanoFetch<any[]>("/expedition_passage_logs")
}

export async function getExpeditionPassageLogById(id: number) {
  return xanoFetch<any>(`/expedition_passage_logs/${id}`)
}

export async function createExpeditionPassageLog(data: Record<string, any>) {
  return xanoFetch<any>("/expedition_passage_logs", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateExpeditionPassageLog(id: number, data: Record<string, any>) {
  return xanoFetch<any>(`/expedition_passage_logs/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export async function deleteExpeditionPassageLog(id: number) {
  return xanoFetch<any>(`/expedition_passage_logs/${id}`, {
    method: "DELETE",
  })
}

// ============ Toddle Integration ============
export async function reloadToddleStudents() {
  return xanoFetch<any>("/toddle_students_api")
}

// ============ Expedition Transactions ============
export async function getExpeditionTransactionsByDateByStudent(
  studentsId: number,
  expeditionsId: number,
  startDate: string | null,
  endDate: string | null
) {
  const params = new URLSearchParams()
  if (startDate) params.append('startDate', startDate)
  if (endDate) params.append('endDate', endDate)
  params.append('students_id', studentsId.toString())
  params.append('expeditions_id', expeditionsId.toString())
  return xanoFetch<any[]>(`/expedition_transactions_by_date_by_student?${params.toString()}`)
}

// ============ Expeditions Store ============
export async function getExpeditionsStore() {
  return xanoFetch<any[]>("/expeditions_store")
}

export async function getExpeditionsStoreItem(id: number) {
  return xanoFetch<any>(`/expeditions_store/${id}`)
}

export async function createExpeditionsStoreItem(data: {
  product_name: string
  quantity: number
  description: string
  isArchived: boolean
  product_image: string
  price: number
}) {
  return xanoFetch<any>("/expeditions_store", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateExpeditionsStoreItem(id: number, data: Record<string, any>) {
  return xanoFetch<any>(`/expeditions_store/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export async function deleteExpeditionsStoreItem(id: number) {
  return xanoFetch<any>(`/expeditions_store/${id}`, {
    method: "DELETE",
  })
}

// ============ Expedition Transactions (All types including purchases) ============
export async function getExpeditionTransactions(expeditionsId: number) {
  return xanoFetch<any[]>(`/expedition_transactions?expeditions_id=${expeditionsId}`)
}

export async function getExpeditionTransactionById(id: number) {
  return xanoFetch<any>(`/expedition_transactions/${id}`)
}

export async function updateExpeditionTransaction(id: number, data: {
  date?: string
  transaction?: string
  amount?: number
  students_id?: number
  expeditions_id?: number
  expeditions_store_id?: number
  quantity?: number
}) {
  return xanoFetch<any>(`/expedition_transactions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export async function deleteExpeditionTransaction(id: number) {
  return xanoFetch<any>(`/expedition_transactions/${id}`, {
    method: "DELETE",
  })
}

// ============ Students with Balance ============
export async function getStudentsWithBalance(expeditionsId?: number) {
  const url = expeditionsId 
    ? `/students_with_balance?expeditions_id=${expeditionsId}`
    : "/students_with_balance"
  return xanoFetch<any[]>(url)
}

// ============ Expedition Transactions (for store purchases) ============
// ============ Expeditions Inventory ============
export async function getExpeditionsInventory() {
  return xanoFetch<any[]>("/expeditions_inventory")
}

export async function getExpeditionsInventoryItem(id: number) {
  return xanoFetch<any>(`/expeditions_inventory/${id}`)
}

export async function createExpeditionsInventoryItem(data: {
  name: string
  type: string
  location: string
  packages: number
  oz_per_package: number
  notes?: string
}) {
  return xanoFetch<any>("/expeditions_inventory", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateExpeditionsInventoryItem(id: number, data: Record<string, any>) {
  return xanoFetch<any>(`/expeditions_inventory/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export async function deleteExpeditionsInventoryItem(id: number) {
  return xanoFetch<any>(`/expeditions_inventory/${id}`, {
    method: "DELETE",
  })
}

export async function createExpeditionTransaction(data: {
  date: string | null
  transaction: string
  amount: number
  students_id: number
  expeditions_id: number
  expeditions_store_id: number
  quantity: number
}) {
  return xanoFetch<any>("/expedition_transactions", {
    method: "POST",
    body: JSON.stringify(data),
  })
}