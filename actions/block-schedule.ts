"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

// Define the schema for block schedule data
const blockScheduleSchema = z.object({
  roomId: z.string().min(1, "Room is required"),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  isRecurring: z.boolean().optional(),
  recurrenceType: z.enum(["daily", "weekly", "monthly"]).optional(),
  recurrenceEndDate: z.string().optional(),
  reason: z.string().optional(),
})

export type BlockScheduleFormData = z.infer<typeof blockScheduleSchema>

export async function saveBlockSchedule(formData: BlockScheduleFormData) {
  try {
    // Validate the form data
    const validatedData = blockScheduleSchema.parse(formData)

    // Check if end time is after start time
    if (validatedData.startTime >= validatedData.endTime) {
      return {
        success: false,
        message: "End time must be after start time",
      }
    }

    // If recurring, check that end date is provided and valid
    if (validatedData.isRecurring && validatedData.recurrenceType) {
      if (!validatedData.recurrenceEndDate) {
        return {
          success: false,
          message: "End date is required for recurring blocks",
        }
      }

      // Check that recurrence end date is after the start date
      if (validatedData.recurrenceEndDate <= validatedData.date) {
        return {
          success: false,
          message: "Recurrence end date must be after the start date",
        }
      }
    }

    // TODO: Replace with your actual database logic
    console.log("Saving block schedule:", validatedData)

    // For one-time blocks
    if (!validatedData.isRecurring) {
      // Save single block to database
      await createBlockInDatabase({
        roomId: validatedData.roomId,
        date: validatedData.date,
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        reason: validatedData.reason || "Blocked",
      })
    } else {
      // For recurring blocks
      await createRecurringBlocksInDatabase({
        roomId: validatedData.roomId,
        startDate: validatedData.date,
        endDate: validatedData.recurrenceEndDate!,
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        recurrenceType: validatedData.recurrenceType!,
        reason: validatedData.reason || "Blocked",
      })
    }

    // Revalidate the agenda paths to refresh the UI
    revalidatePath("/agenda/day")
    revalidatePath("/agenda/week")

    return {
      success: true,
      message: "Schedule blocked successfully",
    }
  } catch (error) {
    console.error("Error saving block schedule:", error)
    if (error instanceof z.ZodError) {
      // Return validation errors
      return {
        success: false,
        message: "Validation error",
        errors: error.errors,
      }
    }

    return {
      success: false,
      message: "Failed to block schedule. Please try again.",
    }
  }
}

// Helper functions for database operations
// Replace these with your actual database logic

async function createBlockInDatabase({
  roomId,
  date,
  startTime,
  endTime,
  reason,
}: {
  roomId: string
  date: string
  startTime: string
  endTime: string
  reason: string
}) {
  // TODO: Replace with your actual database logic
  // Example: await db.blocks.create({ data: { roomId, date, startTime, endTime, reason } })
  console.log("Creating block:", { roomId, date, startTime, endTime, reason })
  // Simulate database operation
  await new Promise((resolve) => setTimeout(resolve, 500))
  return { id: "block-" + Date.now() }
}

async function createRecurringBlocksInDatabase({
  roomId,
  startDate,
  endDate,
  startTime,
  endTime,
  recurrenceType,
  reason,
}: {
  roomId: string
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  recurrenceType: "daily" | "weekly" | "monthly"
  reason: string
}) {
  // TODO: Replace with your actual database logic
  // This would typically create multiple blocks based on the recurrence pattern
  console.log("Creating recurring blocks:", {
    roomId,
    startDate,
    endDate,
    startTime,
    endTime,
    recurrenceType,
    reason,
  })

  // Simulate database operation
  await new Promise((resolve) => setTimeout(resolve, 500))
  return { id: "recurring-" + Date.now() }
}

