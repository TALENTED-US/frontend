import { apiClient, normalizeApiError, unwrapApiResponse } from './client'

export async function getTimelineApi({ fresh = false } = {}) {
  try {
    return unwrapApiResponse(
      await apiClient.get('timeline', {
        ...(fresh ? { params: { _t: Date.now() } } : {}),
        headers: fresh
          ? {
              'Cache-Control': 'no-cache',
              Pragma: 'no-cache',
            }
          : undefined,
      }),
    )
  } catch (error) {
    throw normalizeApiError(error)
  }
}
