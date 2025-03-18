/**
 * Saves data to localStorage with error handling
 * @param key The key to store the data under
 * @param data The data to store
 * @returns boolean indicating success or failure
 */
export function saveToStorage(key: string, data: any): boolean {
  try {
    if (typeof window === "undefined") return false

    const serializedData = JSON.stringify(data)
    localStorage.setItem(key, serializedData)

    // Dispatch a custom event to notify other components of the change
    window.dispatchEvent(
      new CustomEvent("storage-updated", {
        detail: { key, data },
      }),
    )

    return true
  } catch (error) {
    console.error(`Error saving to localStorage (key: ${key}):`, error)
    return false
  }
}

/**
 * Retrieves data from localStorage with error handling
 * @param key The key to retrieve data from
 * @param defaultValue Default value to return if key doesn't exist or on error
 * @returns The retrieved data or defaultValue
 */
export function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    if (typeof window === "undefined") return defaultValue

    const serializedData = localStorage.getItem(key)
    if (serializedData === null) {
      return defaultValue
    }
    return JSON.parse(serializedData) as T
  } catch (error) {
    console.error(`Error retrieving from localStorage (key: ${key}):`, error)
    return defaultValue
  }
}

/**
 * Removes data from localStorage with error handling
 * @param key The key to remove
 * @returns boolean indicating success or failure
 */
export function removeFromStorage(key: string): boolean {
  try {
    if (typeof window === "undefined") return false

    localStorage.removeItem(key)

    // Dispatch a custom event to notify other components of the change
    window.dispatchEvent(
      new CustomEvent("storage-updated", {
        detail: { key, removed: true },
      }),
    )

    return true
  } catch (error) {
    console.error(`Error removing from localStorage (key: ${key}):`, error)
    return false
  }
}

/**
 * Clears all data from localStorage with error handling
 * @returns boolean indicating success or failure
 */
export function clearStorage(): boolean {
  try {
    if (typeof window === "undefined") return false

    localStorage.clear()

    // Dispatch a custom event to notify other components of the change
    window.dispatchEvent(new CustomEvent("storage-cleared"))

    return true
  } catch (error) {
    console.error("Error clearing localStorage:", error)
    return false
  }
}

