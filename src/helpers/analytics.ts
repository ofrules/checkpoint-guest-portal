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
    buildingID: buildingId,
    checkpointID: checkpointId,
    extFeedbackID: extFeedbackId,
    guestID: store.guestID
  })
}

export const trackAnalyticsContentViewed = () => {
  pushAnalyticsEvent(AnalyticsEvent.CONTENT_VIEWED, {
    buildingID: store.buildingId,
    checkpointID: store.checkpointId,
    viewID: store.selectedView?.id,
    view_title: store.selectedView?.texts?.[store.chosenLang]?.title || store.selectedView?.id,
    guestID: store.guestID
  })
}

export const trackAnalyticsActionCompleted = (
  actionType: string,
  actionId: string | undefined | null,
  extraPayload: Record<string, any> = {}
) => {
  pushAnalyticsEvent(AnalyticsEvent.ACTION_COMPLETED, {
    buildingID: store.buildingId,
    checkpointID: store.checkpointId,
    viewID: store.selectedView?.id,
    guestID: store.guestID,
    extUserActionID: store.extUserActionId,
    action_type: actionType,
    actionID: actionId,
    ...extraPayload
  })
}
