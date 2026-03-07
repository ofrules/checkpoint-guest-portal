# Analytics Dashboard Setup Plan (ENG-43)

## 1. GTM (Google Tag Manager) Configuration

### Step 1.1: Create Data Layer Variables
In your GTM workspace, go to **Variables** > **New**. Create the following "Data Layer Variable" types:
*   **Name:** `DLV - building_id`, **Data Layer Variable Name:** `building_id`
*   **Name:** `DLV - checkpoint_id`, **Data Layer Variable Name:** `checkpoint_id`
*   **Name:** `DLV - action_type`, **Data Layer Variable Name:** `action_type`
*   **Name:** `DLV - action_id`, **Data Layer Variable Name:** `action_id`
*   **Name:** `DLV - view_id`, **Data Layer Variable Name:** `view_id`
*   **Name:** `DLV - view_title`, **Data Layer Variable Name:** `view_title`
*   **Name:** `DLV - score`, **Data Layer Variable Name:** `score`

### Step 1.2: Create Triggers
Go to **Triggers** > **New**. Create the following "Custom Event" triggers:
*   **Name:** `Custom Event - qr_scanned`, **Event Name:** `qr_scanned`
*   **Name:** `Custom Event - content_viewed`, **Event Name:** `content_viewed`
*   **Name:** `Custom Event - action_completed`, **Event Name:** `action_completed`

### Step 1.3: Create Tags
Go to **Tags** > **New**. Create "Google Analytics: GA4 Event" tags. Select your GA4 Configuration tag (or enter the Measurement ID).
*   **Tag 1: GA4 - QR Scanned**
    *   **Event Name:** `qr_scanned`
    *   **Event Parameters:**
        *   `building_id` -> `{{DLV - building_id}}`
        *   `checkpoint_id` -> `{{DLV - checkpoint_id}}`
    *   **Trigger:** `Custom Event - qr_scanned`

*   **Tag 2: GA4 - Content Viewed**
    *   **Event Name:** `content_viewed`
    *   **Event Parameters:**
        *   `building_id` -> `{{DLV - building_id}}`
        *   `view_id` -> `{{DLV - view_id}}`
        *   `view_title` -> `{{DLV - view_title}}`
    *   **Trigger:** `Custom Event - content_viewed`

*   **Tag 3: GA4 - Action Completed**
    *   **Event Name:** `action_completed`
    *   **Event Parameters:**
        *   `building_id` -> `{{DLV - building_id}}`
        *   `action_type` -> `{{DLV - action_type}}`
        *   `action_id` -> `{{DLV - action_id}}`
        *   `score` -> `{{DLV - score}}`
    *   **Trigger:** `Custom Event - action_completed`

---

## 2. GA4 Configuration

Once events are flowing from GTM, go to **GA4 Admin** > **Data display** > **Custom definitions**.
Create the following **Custom dimensions** (Scope: Event):
1.  **Dimension Name:** `Building ID`, **Event parameter:** `building_id`
2.  **Dimension Name:** `Checkpoint ID`, **Event parameter:** `checkpoint_id`
3.  **Dimension Name:** `Action Type`, **Event parameter:** `action_type`
4.  **Dimension Name:** `Action ID`, **Event parameter:** `action_id`
5.  **Dimension Name:** `View ID`, **Event parameter:** `view_id`
6.  **Dimension Name:** `View Title`, **Event parameter:** `view_title`

Create a **Custom metric** (if you want to average the score):
1.  **Metric Name:** `Review Score`, **Event parameter:** `score`, **Unit of measurement:** Standard

---

## 3. Looker Studio Dashboard Setup

Create a new report in Looker Studio and connect it to your GA4 property.

### Table 1: Overview per Client (Monthly)
*   **Data Source:** GA4
*   **Dimensions:** `Building ID`, `Year month` (or `Month`)
*   **Metrics:** 
    *   `Event count` (filtered by Event Name = `qr_scanned`) -> rename to "QR Scans"
    *   `Event count` (filtered by Event Name = `action_completed`) -> rename to "Total Actions"
*   **Filters:** You can create specific metrics or blend data to get these counts neatly aligned in one table.

### Table 2: Most Viewed Content per Client
*   **Data Source:** GA4
*   **Dimensions:** `Building ID`, `View Title`
*   **Metrics:** `Event count`
*   **Filter:** Event Name strictly exactly matches `content_viewed`
*   **Sort:** Event count (Descending)

### Table 3: Actions Breakdown
*   **Data Source:** GA4
*   **Dimensions:** `Building ID`, `Action Type`, `Action ID`
*   **Metrics:** `Event count`
*   **Filter:** Event Name strictly exactly matches `action_completed`
