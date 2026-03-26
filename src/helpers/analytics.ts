import store from '@/store'

export enum AnalyticsEvent {
  QR_SCANNED = 'qr_scanned',
  CONTENT_VIEWED = 'content_viewed',
  ACTION_COMPLETED = 'action_completed'
}

const pushAnalyticsEvent = (eventName: AnalyticsEvent, payload: Record<string, any>) => {
  const dataLayer = (window.dataLayer = window.dataLayer || [])
  dataLayer.push({
    event: eventName,
    ...payload
  })
}

export const trackAnalyticsQrScanned = (buildingId: any, checkpointId: any, extFeedbackId: any) => {
  pushAnalyticsEvent(AnalyticsEvent.QR_SCANNED, {
    building_id: buildingId,
    checkpoint_id: checkpointId,
    ext_feedback_id: extFeedbackId,
    guest_id: store.guestID
  })
}

export const trackAnalyticsContentViewed = () => {
  pushAnalyticsEvent(AnalyticsEvent.CONTENT_VIEWED, {
    building_id: store.buildingId,
    checkpoint_id: store.checkpointId,
    view_id: store.selectedView?.id,
    view_title: store.selectedView?.texts?.[store.chosenLang]?.title || store.selectedView?.id,
    guest_id: store.guestID
  })
}

export const trackAnalyticsActionCompleted = (
  actionType: string,
  actionId: string | undefined | null,
  extraPayload: Record<string, any> = {}
) => {
  pushAnalyticsEvent(AnalyticsEvent.ACTION_COMPLETED, {
    building_id: store.buildingId,
    checkpoint_id: store.checkpointId,
    view_id: store.selectedView?.id,
    guest_id: store.guestID,
    ext_user_action_id: store.extUserActionId,
    action_type: actionType,
    action_id: actionId,
    ...extraPayload
  })
}
