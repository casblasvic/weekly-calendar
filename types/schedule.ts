export type TimeRange = {
  start: string
  end: string
}

export type DaySchedule = {
  isOpen: boolean
  ranges: TimeRange[]
}

export type WeekSchedule = {
  monday: DaySchedule
  tuesday: DaySchedule
  wednesday: DaySchedule
  thursday: DaySchedule
  friday: DaySchedule
  saturday: DaySchedule
  sunday: DaySchedule
}

export const DEFAULT_SCHEDULE: WeekSchedule = {
  monday: { isOpen: true, ranges: [{ start: "09:00", end: "18:00" }] },
  tuesday: { isOpen: true, ranges: [{ start: "09:00", end: "18:00" }] },
  wednesday: { isOpen: true, ranges: [{ start: "09:00", end: "18:00" }] },
  thursday: { isOpen: true, ranges: [{ start: "09:00", end: "18:00" }] },
  friday: { isOpen: true, ranges: [{ start: "09:00", end: "18:00" }] },
  saturday: { isOpen: false, ranges: [] },
  sunday: { isOpen: false, ranges: [] },
}

