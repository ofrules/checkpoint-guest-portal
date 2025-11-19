import { getStorage, ref, getDownloadURL } from 'firebase/storage'
import { firebaseApp } from '@/services/firebase-config'

const storage = getStorage(firebaseApp)

/**
 * Get download URL for a Firebase Storage file
 * @param gsUrl - Firebase Storage URL in format: gs://bucket-name/path/to/file
 * @returns Promise with the download URL
 */
export async function getStorageUrl(gsUrl: string): Promise<string> {
  try {
    // Extract the path from gs:// URL
    const path = gsUrl.replace(/^gs:\/\/[^/]+\//, '')

    const storageRef = ref(storage, path)
    const url = await getDownloadURL(storageRef)

    return url
  } catch (error) {
    console.error('Error getting storage URL:', error)
    throw error
  }
}

/**
 * Convert gs:// URL to https:// URL without authentication (for public files)
 * @param gsUrl - Firebase Storage URL in format: gs://bucket-name/path/to/file
 * @returns HTTPS URL
 */
export function gsToHttps(gsUrl: string): string {
  // Extract bucket and path from gs:// URL
  const match = gsUrl.match(/^gs:\/\/([^/]+)\/(.+)$/)

  if (!match) {
    return gsUrl
  }

  const [, bucket, path] = match
  const encodedPath = path.split('/').map(encodeURIComponent).join('%2F')

  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`
}
