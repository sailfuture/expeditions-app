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

// ============ Expedition Schedules ============
export async function getExpeditionSchedules() {
  return xanoFetch<any[]>("/expedition_schedule")
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

export async function addAllDatesForExpedition() {
  return xanoFetch<any>("/add_all_dates", {
    method: "POST",
  })
}

// ============ Expedition Schedule Items ============
export async function getExpeditionScheduleItems() {
  return xanoFetch<any[]>("/expedition_schedule_items")
}

export async function getExpeditionScheduleItemById(id: number) {
  return xanoFetch<any>(`/expedition_schedule_items/${id}`)
}

export async function getExpeditionScheduleItemsByDate(date: string) {
  return xanoFetch<any[]>(`/expedition_schedule_items_date?date=${date}`)
}

export async function createExpeditionScheduleItem(data: Record<string, any>) {
  return xanoFetch<any>("/expedition_schedule_items", {
    method: "POST",
    body: JSON.stringify(data),
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

// ============ Teachers (Staff) ============
export async function getTeachers() {
  return xanoFetch<any[]>("/teachers")
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

export async function getExpeditionsProfessionalismByDate(date: string) {
  return xanoFetch<any[]>(`/expeditions_professionalism_by_date?date=${date}`)
}

export async function addStudentsToProfessionalism(date: string) {
  return xanoFetch<any>(`/add_students_to_professionalism?date=${date}`)
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