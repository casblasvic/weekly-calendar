import { cookies } from 'next/headers'

export async function getSystemId(): Promise<string | null> {
  const cookieStore = await cookies()
  const systemId = cookieStore.get('systemId')
  return systemId?.value || null
}

export async function requireSystemId(): Promise<string> {
  const cookieStore = await cookies()
  const systemId = cookieStore.get('systemId')?.value
  if (!systemId) {
    throw new Error('System ID not found in cookies')
  }
  return systemId
}
