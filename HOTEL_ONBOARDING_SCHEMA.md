# Hotel Onboarding Data Schema for Gemini Automation

This document formalizes the data structure required for onboarding new hotels into the guest portal system. It includes TypeScript interfaces representing the configuration objects, followed by an explanation of how AI tools can be leveraged to automate the population of this data.

## 1. Formalized Data Schema (TypeScript)

This schema defines the structure for a `HotelConfig` object, which encapsulates all necessary information for a hotel's guest portal.

```typescript
/**
 * Root configuration for a Hotel (Building).
 */
export interface HotelConfig {
  /** Unique identifier for the hotel (e.g., 'hotel-roklina') */
  buildingId: string;
  /** General details about the hotel */
  details: HotelDetails;
  /**
   * List of interactive actions available to guests.
   * These are the leaf nodes of the interaction tree.
   */
  actions: AnyAction[];
  /**
   * List of navigation views (menus) that group actions.
   * These are the branches of the interaction tree.
   */
  views: FeedbackView[];
}

export interface HotelDetails {
  name: string;
  /** Default language code (e.g., 'en', 'sk') */
  defaultLanguage: string;
  /** URL to the hotel's official website */
  websiteUrl?: string;
  /** URL to the hotel's Google Maps/Reviews page */
  googleMapsUrl?: string;
}

/**
 * Base interface for all actions.
 */
interface BaseAction {
  id: string; // Unique ID (e.g., 'massage-order', 'wifi-issue')
  type: ActionType;
  /** Reference to a template path if inherited (optional) */
  templatePath?: string;
  /**
   * Localized text content for the action.
   * Key is the language code (e.g., 'en').
   */
  texts: Record<string, ActionTexts>;
}

export type ActionType = 'occurrence' | 'order' | 'question' | 'review' | 'link' | 'info';

/**
 * 1. Occurrence Action
 * Used for reporting issues (e.g., "Missing Towels", "Wifi not working").
 */
export interface OccurrenceAction extends BaseAction {
  type: 'occurrence';
  texts: Record<string, {
    title: string;          // e.g., "Report an Issue"
    text: string;           // e.g., "Please describe the issue..."
    buttonOk: string;       // e.g., "Report"
    buttonBack: string;
    successTitle: string;   // e.g., "We are on it!"
    successText: string;
    successText2?: string;
    cancelTitle?: string;
    cancelText?: string;
    buttonCTA?: string;     // e.g., "Leave a Review" (Upsell)
    buttonBackMenu?: string;
  }>;
}

/**
 * 2. Order Action
 * Used for ordering services (e.g., Wellness, Room Service).
 */
export interface OrderAction extends BaseAction {
  type: 'order';
  /** Configuration options for the order form */
  options: {
    selection?: boolean;      // Enable time/slot selection
    inputNumber?: boolean;    // Enable quantity input
    inputText?: boolean;      // Enable generic text input
    inputText2?: boolean;
    checkbox?: boolean;       // Enable checkboxes
    noteInput?: boolean;      // Enable note field
    emailInput?: boolean;     // Enable email field
    phoneInput?: boolean;     // Enable phone field
    phoneRequired?: boolean;
    emailRequired?: boolean;
    noteRequired?: boolean;
  };
  /** Reservation logic configuration */
  reservation?: {
    type: 'today' | 'tomorrow' | 'any';
    /** Available time slots */
    times: Array<{
      start: string; // "10:00"
      end?: string;  // "11:00"
      type: string;  // Grouping key (e.g., "Morning")
    }>;
    exclusive?: boolean;      // Single slot booking?
    capacity?: number;        // Max capacity per slot
    hoursInAdvance?: number;  // Min hours before booking
  };
  texts: Record<string, {
    title: string;
    text?: string;
    texts?: string[];         // Additional paragraphs
    selectionText?: string;   // Label for slot selection
    reservationFull?: string; // Error msg when full
    numberInputText?: string; // Header for quantity
    inputText?: string;       // Label for generic input
    checkboxes?: string[];    // Labels for checkboxes
    checkboxesTexts?: string[]; // Values/descriptions for checkboxes
    noteInput?: string;       // Label for note
    emailInput?: string;
    phoneInput?: string;
    buttonOk: string;
    successTitle: string;
    successText: string;
    buttonCTA?: string;
  }>;
}

/**
 * 3. Question Action
 * Used for FAQ or Ask Reception.
 */
export interface QuestionAction extends BaseAction {
  type: 'question';
  texts: Record<string, {
    title: string;
    text: string;
    inputQuestionText: string; // Label for the question input
    typeQuestionText?: string; // Hint
    requiredText?: string;     // Error msg
    phoneText?: string;
    buttonNext: string;
    buttonOk: string;
    successTitle: string;
    successText: string;
  }>;
}

/**
 * 4. Review Action
 * Used for collecting feedback/NPS.
 */
export interface ReviewAction extends BaseAction {
  type: 'review';
  texts: Record<string, {
    title: string;
    text: string;
    requiredScore: string;     // Error msg if no score
    inputText?: string;        // Label for "Tell us more"
    buttonOk: string;
    successTitle: string;
    successText: string;
    buttonCTA?: string;        // Redirect to Google Maps/TripAdvisor
  }>;
}

/**
 * 5. Link Action
 * Used for external links (website, menu PDF) or SMS shortcuts.
 */
export interface LinkAction extends BaseAction {
  type: 'link';
  url: string; // "https://..." or "sms:..."
  texts: Record<string, {
    listTitle: string; // Title shown in the menu
    listText?: string; // Subtitle shown in the menu
    smsBody?: string;  // Pre-filled SMS body if url is sms:
  }>;
}

/**
 * A Union of all possible actions
 */
export type AnyAction = OccurrenceAction | OrderAction | QuestionAction | ReviewAction | LinkAction;

/**
 * Navigation View (Menu)
 */
export interface FeedbackView {
  id: string; // e.g., 'wellness-menu', 'room-service-menu'
  /** How the children are displayed */
  viewType: 'tile' | 'expansion' | 'list';
  /**
   * List of IDs.
   * Can reference `actions` (leaves) or other `views` (branches).
   */
  actions: string[];
  /** Optional upsell action ID (e.g., 'review') */
  upsellId?: string;
  texts: Record<string, {
    title: string;     // Title of this view (page header)
    listTitle?: string;// Title of this view when it appears as a button in a parent view
    listText?: string; // Description in parent view
    ctaText?: string;  // Text above the Upsell button
    buttonCTA?: string;// Upsell button text
  }>;
}
```

## 2. AI Tool Recommendation & Onboarding Automation Strategy

This section outlines how to leverage advanced AI capabilities to automate the process of populating the `HotelConfig` schema for new hotels.

**Goal:** To move from manual data entry or ad-hoc information gathering to a structured, AI-driven process that directly generates the required configuration.

### Recommended Workflow:

1.  **Input Gathering (Multi-modal):**
    The initial step involves collecting raw information about the hotel from various sources. This can be automated using existing and future tools:

    *   **Website Crawling**: Utilize web scraping tools (`web_fetch`) to extract information from the hotel's official website, focusing on:
        *   Services offered (Spa, Restaurant, Concierge)
        *   FAQ sections
        *   Contact information
        *   About Us/Amenities pages
    *   **Document Parsing**: Allow for the upload and OCR/NLP processing of structured and unstructured documents:
        *   **PDF Menus**: Spa menus, restaurant menus, room service guides.
        *   **Guest Directories**: Digital or scanned versions of in-room guest information books.
        *   **Brochures**: Marketing materials containing hotel services and local attractions.
    *   **Image Analysis (Vision Models)**: Upload photos of physical menus, price lists, or information boards. Advanced vision models can extract text and structure from these images.
    *   **Review Aggregation**: Fetch hotel reviews from platforms like Google Maps (using `google_web_search`) to identify common feedback topics, positive aspects (for upsells), and negative issues (for occurrence actions).

2.  **AI Processing (Gemini Pro 1.5 / GPT-4o, etc.):**
    This is the core automation step where large language models (LLMs) with multi-modal capabilities parse the gathered inputs and map them to the defined `HotelConfig` schema.

    *   **Model Selection**: Employ advanced LLMs like Gemini 1.5 Pro or GPT-4o, which excel at understanding complex instructions, processing large contexts, and handling multi-modal inputs (text, images).
    *   **Prompt Strategy**:
        *   **System Prompt**: Always include the complete `HotelConfig` TypeScript interface (or its JSON Schema equivalent) in the system prompt. Instruct the AI to strictly adhere to this schema for output generation.
        *   **User Prompt**: Provide the gathered raw data (website text, parsed documents, image descriptions, review summaries) to the AI. Clearly state the objective: "Generate a `HotelConfig` JSON object based on the following hotel information, strictly adhering to the provided schema."

    *   **Specific Extraction Examples:**
        *   **For `ReviewAction`**:
            "Analyze the following hotel reviews from Google [URL/text]. If there's a strong sentiment for leaving a Google review for satisfied guests, create a `ReviewAction` with `buttonCTA` set to 'Leave a Google Review' and `googleMapsUrl` pointing to the hotel's review page. Ensure the `successTitle` and `successText` align with positive feedback."
        *   **For `OrderAction` (Room Service)**:
            "From the attached 'Room Service Menu.pdf', extract all breakfast items. For each item, create an `OrderAction`. If an item has customizable options (e.g., 'scrambled or fried eggs'), consider using `checkboxes` in the `options` field. Populate `texts` for English and German, including `title`, `text` (description), and `buttonOk` ('Order')."
        *   **For `OccurrenceAction`**:
            "Based on common guest complaints found in online reviews and internal FAQs, generate `OccurrenceAction` entries for 'No Hot Water', 'AC Malfunction', and 'Noisy Room'. Ensure appropriate `title`, `text`, and `successText` are provided."
        *   **For `LinkAction`**:
            "From the hotel website [URL], find the 'Wellness & Spa' section. Extract the link to the full Spa treatment list (if it's a PDF or separate page). Create a `LinkAction` with `url` pointing to this link and `listTitle` as 'Spa Treatment List'. Also, if a direct SMS number for the concierge is available, create a `LinkAction` for that with a pre-filled `smsBody`."

3.  **Output Generation & Validation:**
    *   The AI will generate a JSON object conforming to the `HotelConfig` schema.
    *   This JSON output can then be automatically validated against the schema.
    *   Upon successful validation, the JSON can be directly used to populate the Firestore database (e.g., via a Cloud Function or a script that uses the Firebase Admin SDK).

### Benefits of this Approach:

*   **Scalability**: Automates the onboarding process, making it significantly faster to add new hotels.
*   **Consistency**: Ensures all hotel configurations adhere to a predefined structure, reducing errors and improving maintainability.
*   **Efficiency**: Reduces manual effort and the need for human intervention in data structuring.
*   **Multi-language Support**: Facilitates automatic generation of localized content based on source material.
*   **Flexibility**: The schema can be extended to include new action types or view layouts as the guest portal evolves.

## 3. Data Usage & UI Representation

Understanding how the configured data manifests in the final application is crucial for accurate data generation. The guest portal is a dynamic Vue.js application that renders components based on the `type` and `viewType` properties defined in the schema.

### 3.1 Views (Navigation & Structure)
The `views` array defines the application's navigation hierarchy. A View acts as a container or menu for other actions.

*   **`viewType: 'tile'`**: Renders as a grid of cards (`ActionListView.vue` -> `v-card`). Best used for the main dashboard or top-level menus (e.g., "Main Menu", "Wellness Services").
    *   *AI Hint*: Use this for the root view and major categories.
*   **`viewType: 'expansion'`**: Renders as an accordion list (`ActionListExpandItem.vue`). Suitable for grouped items like "Breakfast Menu" where users expand sections to see details.
*   **`viewType: 'list'`**: Renders as a simple vertical list of buttons. Good for simple selection menus.

**Field Mapping:**
*   `texts.title`: Displayed as the page header (H1).
*   `texts.listTitle`: Used when this view is nested inside another parent view (the button label).
*   `actions`: An array of IDs. These IDs must match either another `view.id` (creating a submenu) or an `action.id` (creating a clickable action).

### 3.2 Actions (Interactive Elements)
Each `action` type corresponds to a specific Vue component, defining the interaction model.

#### **OccurrenceAction (`type: 'occurrence'`)**
*   **Component**: `OccurrenceAction.vue`
*   **Use Case**: Simple one-click reporting or requests.
*   **UI Behavior**: Displays a title, description, and a primary "Report/Confirm" button. Upon clicking, it transitions to a success screen.
*   *AI Hint*: Use for "I need towels", "Report a bug", "Call me back".

#### **OrderAction (`type: 'order'`)**
*   **Component**: `OrderAction.vue`
*   **Use Case**: Complex forms for booking services or ordering items.
*   **UI Behavior**: A dynamic form builder.
    *   `options.selection`: Renders radio buttons or time slots.
    *   `reservation`: If defined, renders a tabbed interface for time slot selection (e.g., Morning/Afternoon).
    *   `options.checkbox`: Renders a list of checkboxes from `texts.checkboxes`.
    *   `options.inputNumber`: Renders a quantity counter.
    *   `options.noteInput` / `emailInput` / `phoneInput`: Renders respective text fields.
*   *AI Hint*: Use for "Book Massage", "Order Breakfast", "Room Service". Ensure `options` are enabled only for fields that make sense for the specific service.

#### **QuestionAction (`type: 'question'`)**
*   **Component**: `QuestionAction.vue`
*   **Use Case**: Multi-step wizard for asking open-ended questions.
*   **UI Behavior**: Step 1: Text input area. Step 2: Contact details input. Step 3: Success message.
*   *AI Hint*: Use for "Ask Reception", "General Inquiry".

#### **ReviewAction (`type: 'review'`)**
*   **Component**: `ReviewAction.vue`
*   **Use Case**: Collecting star ratings and feedback.
*   **UI Behavior**: Star rating input (1-5). Conditional logic often applies (e.g., low score -> internal feedback, high score -> external link via `buttonCTA`).
*   *AI Hint*: Use for "Rate your Stay". Connect high ratings to Google Maps via `buttonCTA`.

#### **LinkAction (`type: 'link'`)**
*   **Component**: Handled directly in `ActionListView.vue`.
*   **Use Case**: Redirects.
*   **UI Behavior**: Opens `url` in a new tab. If `url` starts with `sms:`, it pre-fills the SMS app.
*   *AI Hint*: Use for "Visit Website", "Download Menu (PDF)", or "Text Concierge".

### 3.3 Text & Localization
*   The application is multi-lingual. The `texts` object must contain keys for every supported language code (e.g., `en`, `de`, `sk`).
*   **Missing translations will result in empty UI labels.**
*   *AI Hint*: Always generate English (`en`) as a baseline. When localizing, ensure the tone matches the hotel's brand (formal vs. casual).