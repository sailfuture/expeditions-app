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

// ============ Expedition Schedule Items ============
export async function getExpeditionScheduleItems() {
  return xanoFetch<any[]>("/expedition_schedule_items")
}

export async function getExpeditionScheduleItemById(id: number) {
  return xanoFetch<any>(`/expedition_schedule_items/${id}`)
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
export async function getExpeditionLocations() {
  return xanoFetch<any[]>("/expedition_locations")
}
