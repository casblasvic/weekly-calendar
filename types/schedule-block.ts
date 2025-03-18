export interface ScheduleBlock {
  id: string
  clinicId: number
  date: string
  startTime: string
  endTime: string
  roomIds: string[]
  description: string
  recurring: boolean
  recurrencePattern?: {
    frequency: "daily" | "weekly" | "monthly"
    endDate?: string
    daysOfWeek?: number[]
  }
  createdAt: string
}

