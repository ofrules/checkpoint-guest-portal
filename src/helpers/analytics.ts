import store from '@/store'

export const pushAnalyticsEvent = (eventName: string, payload: Record<string, any>) => {
  const dataLayer = window.dataLayer = window.dataLayer || []
  dataLayer.push({
    event: eventName,
    ...payload
  })
}

export const trackActionCompleted = (
  actionType: string,
  actionId: string | undefined | null,
  extraPayload: Record<string, any> = {}
) => {
  pushAnalyticsEvent('action_completed', {
    building_id: store.buildingId,
    action_type: actionType,
    action_id: actionId,
    ...extraPayload
  })
}
