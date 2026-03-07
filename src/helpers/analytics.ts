export const pushAnalyticsEvent = (eventName: string, payload: Record<string, any>) => {
  const dataLayer = (window as any).dataLayer = (window as any).dataLayer || []
  dataLayer.push({
    event: eventName,
    ...payload
  })
}
