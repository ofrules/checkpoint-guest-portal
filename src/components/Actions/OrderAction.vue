<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

import { validatePhone, validateEmail } from '@/helpers'
import store from '@/store'
import * as types from '@/types'
import { trackAnalyticsActionCompleted } from '@/helpers/analytics'
import { gsToHttps } from '@/helpers/firebase-storage'

const route = useRoute()

const endpointUrl = `${__API_URL__}/createExtUserOrder`
const getDataUrl = `${__API_URL__}/extFeedbackActionData`

const maxCapacity = 30

const { selectedAction } = store

const options = selectedAction.options
const reservation = selectedAction?.reservation
const reservationTimes = reservation?.times as types.ReservationTime[]
const isReservationExclusive = !!reservation?.exclusive
const isReservationWithCapacity = !!reservation?.capacity
const areMultipleTimeTypes = !!reservation?.multipleTimeTypes

const texts = computed(() => selectedAction?.texts?.[store.chosenLang] as types.OrderAction)
const reservationText = computed(() => {
  let text = texts.value?.reservationText!
  const textInputs = createTextInputs()
  textInputs?.forEach((input, index) => {
    text = text?.replace(`$${index + 1}`, input ?? '')
  })
  return text
})

// Generate available dates based on daysInAdvance
const generateAvailableDates = () => {
  if (!areMultipleTimeTypes || !reservation) return []

  const daysInAdvance = reservation.daysInAdvance ?? 1
  const dates: { label: string; dateStr: string; i: number }[] = []

  for (let i = 0; i <= daysInAdvance; i++) {
    const date = new Date()
    date.setDate(date.getDate() + i)
    const dateStr = date.toLocaleDateString('sk-SK').replace(/\s/g, '')
    const label = i === 0 ? texts.value?.today : i === 1 ? texts.value?.tomorrow : dateStr
    dates.push({ label: label!, dateStr, i })
  }

  return dates
}

const availableDates = generateAvailableDates()

// For new array-based structure: group times by available dates
// For old structure: group by type field (backward compatibility)
const reservationTimesGroupedByType =
  areMultipleTimeTypes && reservationTimes
    ? (() => {
        // Check if using new array-based structure
        const hasArrayBasedReservations = reservationTimes.some((t) => t.reservations !== undefined)

        if (hasArrayBasedReservations) {
          // New structure: create groups for each available date
          // Note: For new structure, we keep the original time slot ID since the backend
          // expects the index in the reservationTimes array
          const grouped: Record<
            string,
            (types.ReservationTime & { id: number; currentDate?: string })[]
          > = {}

          availableDates.forEach(({ label, dateStr }) => {
            grouped[label] = reservationTimes.map((time, id) => ({
              ...time,
              id,
              currentDate: dateStr
            }))
          })

          return grouped
        } else {
          // Old structure: group by type field (backward compatibility)
          return reservationTimes.reduce(
            (acc, time, id) => {
              const timeType = time.type || 'today'
              if (!acc[timeType]) {
                acc[timeType] = []
              }
              acc[timeType].push({ ...time, id })
              return acc
            },
            {} as Record<string, (types.ReservationTime & { id: number; currentDate?: string })[]>
          )
        }
      })()
    : undefined

const state = reactive({
  activeItem: 0,
  successPage: false,
  loadingBtn: false,
  error: '',
  showError: false,
  inputPhone: store.userPhone || '',
  inputEmail: store.userEmail || '',
  tab: (areMultipleTimeTypes && reservationTimesGroupedByType
    ? Object.keys(reservationTimesGroupedByType)[0]
    : null) as any
})

const inputs = reactive({
  number: 1,
  text: '',
  text2: '',
  selectedOptionId: null as number | null,
  selectedDate: null as string | null, // Track selected date for array-based reservations
  checkboxes: {} as any
})

// Helper to check if a specific time slot option is selected (for multiday with array-based reservations)
const isTimeSlotSelected = (optionId: number, dateStr?: string) => {
  if (!dateStr) {
    // Old structure or non-multiday
    return inputs.selectedOptionId === optionId
  }
  // New structure: must match both ID and date
  return inputs.selectedOptionId === optionId && inputs.selectedDate === dateStr
}

// Helper to select an option (for multiday with array-based reservations)
const selectOption = (optionId: number, dateStr?: string) => {
  inputs.selectedOptionId = optionId
  if (dateStr) {
    inputs.selectedDate = dateStr
  }
}

// Helper function to get reservation date for a specific time slot or general reservation
// For new array-based structure, optionally pass the target date directly
const getReservationDate = (timeSlot?: types.ReservationTime & { currentDate?: string }) => {
  // For new array-based structure with currentDate context
  if (timeSlot?.currentDate) {
    return timeSlot.currentDate
  }

  // For old structure or when no currentDate context
  const date = new Date()

  // For multiday reservations, use the time slot's type (backward compatibility)
  if (areMultipleTimeTypes && timeSlot) {
    if (timeSlot.type === 'tomorrow') {
      date.setDate(date.getDate() + 1)
    }
  }
  // For single day reservations, use the reservation's type
  else if (reservation?.type === 'tomorrow') {
    date.setDate(date.getDate() + 1)
  }

  return date.toLocaleDateString('sk-SK').replace(/\s/g, '')
}

const reservationDate = (() => {
  if (isReservationExclusive || isReservationWithCapacity) {
    return getReservationDate()
  } else {
    return null
  }
})()

const isOptionSelected = computed(() =>
  options?.selection ? inputs.selectedOptionId !== null : true
)
const areAllOptionsDisabled = computed(() => {
  if (options?.selection) {
    return reservationTimes?.every((_, index) => isOptionDisabled(index))
  } else {
    return false
  }
})

// Check if any time slot has full capacity or if general capacity is full
const isFullCapacity = computed(() => {
  // For time slots with capacity
  if (reservationTimes && reservationTimes.some((t) => t.capacity !== undefined)) {
    const selectedTime =
      inputs.selectedOptionId !== null ? reservationTimes[inputs.selectedOptionId] : null
    if (selectedTime && selectedTime.capacity !== undefined) {
      // For new array-based structure, use the selected date
      const timeSlotWithDate = inputs.selectedDate
        ? { ...selectedTime, currentDate: inputs.selectedDate }
        : selectedTime

      const currentDate = getReservationDate(timeSlotWithDate)
      let currentFreeCapacity: number | undefined

      // Check if using new array-based structure
      if (selectedTime.reservations) {
        const dateReservation = selectedTime.reservations.find((r) => r.date === currentDate)
        currentFreeCapacity = dateReservation?.freeCapacity ?? selectedTime.capacity
      } else {
        // Old structure: backward compatibility
        currentFreeCapacity =
          selectedTime.dateReserved === currentDate
            ? selectedTime.freeCapacity
            : selectedTime.capacity
      }

      return currentFreeCapacity === 0
    }
    return false
  }
  // For general capacity (no time slots)
  if (isReservationWithCapacity && reservationDate === reservation?.dateReserved) {
    return !reservation?.freeCapacity
  }
  return false
})

// Get free capacity for selected time slot or general capacity
const freeCapacity = computed(() => {
  // For time slots with capacity
  if (reservationTimes && inputs.selectedOptionId !== null) {
    const selectedTime = reservationTimes[inputs.selectedOptionId]
    if (selectedTime && selectedTime.capacity !== undefined) {
      // For new array-based structure, use the selected date
      const timeSlotWithDate = inputs.selectedDate
        ? { ...selectedTime, currentDate: inputs.selectedDate }
        : selectedTime

      const currentDate = getReservationDate(timeSlotWithDate)

      // Check if using new array-based structure
      if (selectedTime.reservations) {
        const dateReservation = selectedTime.reservations.find((r) => r.date === currentDate)
        return dateReservation?.freeCapacity ?? selectedTime.capacity
      } else {
        // Old structure: backward compatibility
        if (selectedTime.dateReserved === currentDate) {
          return selectedTime.freeCapacity ?? selectedTime.capacity
        } else {
          return selectedTime.capacity
        }
      }
    }
  }
  // For general capacity (no time slots)
  if (isReservationWithCapacity) {
    if (reservationDate === reservation?.dateReserved) {
      return reservation?.freeCapacity
    } else {
      return reservation?.capacity
    }
  }
  return maxCapacity
})
const isPhoneCorrect = computed(
  () =>
    validatePhone(state.inputPhone) && (options?.phoneRequired ? !!state.inputPhone.length : true)
)
const isEmailCorrect = computed(
  () =>
    validateEmail(state.inputEmail) && (options?.emailRequired ? !!state.inputEmail.length : true)
)
const isContactInfoValid = computed(() => {
  // If both are required independently, both must be valid
  if (options?.phoneRequired && options?.emailRequired) {
    return isPhoneCorrect.value && isEmailCorrect.value
  }

  // If either is required, at least one must be filled and valid
  if (options?.phoneOrEmailRequired) {
    const hasValidPhone = state.inputPhone.length > 0 && validatePhone(state.inputPhone)
    const hasValidEmail = state.inputEmail.length > 0 && validateEmail(state.inputEmail)
    return hasValidPhone || hasValidEmail
  }

  // If neither is required, validate only if filled
  return isPhoneCorrect.value && isEmailCorrect.value
})

const formatTimeRange = (
  indexOrOption: number | (types.ReservationTime & { id: number; currentDate?: string }),
  addCapacityInfo = true
) => {
  // Support both index and option object
  let time: (types.ReservationTime & { currentDate?: string }) | undefined
  let index: number

  if (typeof indexOrOption === 'number') {
    index = indexOrOption
    time = reservationTimes?.[index]
  } else {
    index = indexOrOption.id
    time = indexOrOption
  }

  let range = time?.start + (time?.end ? ` - ${time.end}` : '')

  // Add capacity info if available
  if (addCapacityInfo && time?.capacity !== undefined) {
    const currentDate = getReservationDate(time)
    let currentFreeCapacity: number | undefined

    // Check if using new array-based structure
    if (time.reservations) {
      const dateReservation = time.reservations.find((r) => r.date === currentDate)
      currentFreeCapacity = dateReservation?.freeCapacity ?? time.capacity
    } else {
      // Old structure: backward compatibility
      currentFreeCapacity = time.dateReserved === currentDate ? time.freeCapacity : time.capacity
    }

    const currentBookedCapacity = time.capacity - currentFreeCapacity!
    range += ` (${currentBookedCapacity}/${time.capacity})`
  }

  return range
}

const createPostInputs = () => {
  const postInputs = []
  if (options?.selection) {
    // postInputs.push(
    //   selectedAction?.texts?.[store.buildingData?.language ?? 'sk']?.selectOptions?.[
    //     inputs.selectedOption!
    //   ]
    // )
    postInputs.push(formatTimeRange(inputs.selectedOptionId!, false))
  }
  if (options?.inputNumber) {
    postInputs.push(inputs.number.toString())
  }
  if (options?.inputText) {
    postInputs.push(inputs.text)
  }
  if (options?.inputText2) {
    postInputs.push(inputs.text2)
  }
  if (options?.checkbox) {
    const buildingLanguageTexts =
      selectedAction?.texts?.[store.buildingData?.language ?? 'sk']?.checkboxesTexts

    const checkedTexts = Object.keys(inputs.checkboxes)
      .filter((key) => inputs.checkboxes[key])
      .map((_, index) => buildingLanguageTexts?.[index])
      .join(' ')

    postInputs.push(checkedTexts)
  }
  if (areMultipleTimeTypes && inputs.selectedDate) {
    postInputs.push(inputs.selectedDate)
    const selectedDayIdx = availableDates.find((d) => d.dateStr === inputs.selectedDate)?.i
    if (selectedDayIdx !== undefined) {
      postInputs.push(
        selectedDayIdx === 0
          ? selectedAction?.texts?.[store.buildingData?.language ?? 'sk']?.today
          : selectedDayIdx === 1
            ? selectedAction?.texts?.[store.buildingData?.language ?? 'sk']?.tomorrow
            : ''
      )
    }
  }
  return postInputs
}

const createTextInputs = () => {
  const textInputs = []
  if (options?.selection) {
    textInputs.push(formatTimeRange(inputs.selectedOptionId!, false))
  }
  if (options?.inputNumber) {
    textInputs.push(inputs.number.toString())
  }
  if (options?.inputText) {
    textInputs.push(inputs.text)
  }
  if (options?.inputText2) {
    textInputs.push(inputs.text2)
  }
  if (options?.checkbox) {
    const buildingLanguageTexts = texts.value?.checkboxesTexts

    const checkedTexts = Object.keys(inputs.checkboxes)
      .filter((key) => inputs.checkboxes[key])
      .map((_, index) => buildingLanguageTexts?.[index])
      .join(' ')

    textInputs.push(checkedTexts)
  }
  if (areMultipleTimeTypes && inputs.selectedDate) {
    textInputs.push(inputs.selectedDate)
    textInputs.push(availableDates.find((d) => d.dateStr === inputs.selectedDate)?.label)
  }
  return textInputs
}

const pushData = async () => {
  state.loadingBtn = true
  const note = inputs.text2.length ? `${inputs.text}, ${inputs.text2}` : inputs.text

  // Determine if selectedNumber is needed
  const needsSelectedNumber =
    isReservationWithCapacity ||
    (reservationTimes &&
      inputs.selectedOptionId !== null &&
      reservationTimes[inputs.selectedOptionId]?.capacity !== undefined)

  axios
    .post(endpointUrl, {
      buildingId: store.buildingId,
      checkpointId: store.userRoomId ?? store.checkpointId,
      extActionPath: selectedAction?.path,
      selectedOption: inputs.selectedOptionId,
      selectedDate: inputs.selectedDate || undefined, // Send selected date for array-based reservations
      selectedNumber: needsSelectedNumber ? inputs.number : undefined,
      inputs: createPostInputs(),
      note: note,
      phone: state.inputPhone || undefined,
      email: state.inputEmail || undefined
    })
    .then(function (response) {
      store.extUserActionId = response.data?.data
      trackAnalyticsActionCompleted('order', selectedAction?.id)
      state.successPage = true
      state.activeItem = 1
      store.showOrderSuccessNotification = true
      createTextInputs()
      if (isReservationExclusive || isReservationWithCapacity) {
        reloadActionData()
      }
      if (state.inputPhone) {
        store.userPhone = state.inputPhone
        localStorage.setItem('userPhone', store.userPhone)
      }
      if (state.inputEmail) {
        store.userEmail = state.inputEmail
        localStorage.setItem('userEmail', store.userEmail)
      }
    })
    .catch(function (error) {
      state.error = error.response.data
      state.showError = true
      console.log(error)
    })
    .finally(() => {
      state.loadingBtn = false
    })
}

const reloadActionData = async () => {
  axios
    .get(getDataUrl, {
      params: route.query
    })
    .then((response) => {
      store.actionsData = response.data?.actionsDataList
    })
    .catch(function (error) {
      // handle error
      console.log(error)
    })
}

const isOptionReserved = (
  indexOrOption: number | (types.ReservationTime & { id: number; currentDate?: string })
) => {
  // Support both index and option object
  let timeSlot: (types.ReservationTime & { currentDate?: string }) | undefined

  if (typeof indexOrOption === 'number') {
    timeSlot = reservationTimes?.[indexOrOption]
  } else {
    timeSlot = indexOrOption
  }

  if (!timeSlot) return false

  const currentDate = getReservationDate(timeSlot)

  // For exclusive reservations without capacity
  if (isReservationExclusive && timeSlot.capacity === undefined) {
    // Check if using new array-based structure
    if (timeSlot.reservations) {
      return timeSlot.reservations.some((r) => r.date === currentDate)
    } else {
      // Old structure: backward compatibility
      return timeSlot.dateReserved === currentDate
    }
  }

  // For time slots with capacity
  if (timeSlot.capacity !== undefined) {
    let currentFreeCapacity: number | undefined

    // Check if using new array-based structure
    if (timeSlot.reservations) {
      const dateReservation = timeSlot.reservations.find((r) => r.date === currentDate)
      currentFreeCapacity = dateReservation?.freeCapacity ?? timeSlot.capacity
    } else {
      // Old structure: backward compatibility
      currentFreeCapacity =
        timeSlot.dateReserved === currentDate ? timeSlot.freeCapacity : timeSlot.capacity
    }

    return currentFreeCapacity === 0
  }

  return false
}

const isOptionAfterStartTime = (
  indexOrOption: number | (types.ReservationTime & { id: number; currentDate?: string })
) => {
  // Support both index and option object
  let timeSlot: (types.ReservationTime & { currentDate?: string }) | undefined
  let index: number

  if (typeof indexOrOption === 'number') {
    index = indexOrOption
    timeSlot = reservationTimes?.[index]
  } else {
    index = indexOrOption.id
    timeSlot = indexOrOption
  }

  if (!timeSlot) return false

  const optionStartTime = timeSlot.start

  // Determine if this is "today" - check if currentDate matches today
  let isToday: boolean
  if (timeSlot.currentDate) {
    // New structure: compare currentDate with actual today
    const today = new Date().toLocaleDateString('sk-SK').replace(/\s/g, '')
    isToday = timeSlot.currentDate === today
  } else {
    // Old structure: use type field (backward compatibility)
    isToday = areMultipleTimeTypes ? timeSlot.type === 'today' : reservation?.type === 'today'
  }

  if (optionStartTime && isToday) {
    const hoursInAdvance = reservation?.hoursInAdvance ?? 0
    const currentDatePlusAdvance = new Date()
    currentDatePlusAdvance.setHours(currentDatePlusAdvance.getHours() + hoursInAdvance)
    const currentTimePlusAdvance = currentDatePlusAdvance.getTime()
    const [hours, minutes] = optionStartTime.split(':')
    const optionDate = new Date()
    optionDate.setHours(Number(hours))
    optionDate.setMinutes(Number(minutes))
    const optionTime = optionDate.getTime()
    return currentTimePlusAdvance + hoursInAdvance > optionTime
  } else {
    return false
  }
}

const isOptionDisabled = (
  indexOrOption: number | (types.ReservationTime & { id: number; currentDate?: string })
) => {
  if (reservation) {
    return isOptionReserved(indexOrOption) || isOptionAfterStartTime(indexOrOption)
  } else {
    return false
  }
}

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1)

watch(
  () => inputs.number,
  () => {
    if (inputs.number && inputs.number < 1) {
      inputs.number = 1
    }
  }
)

watch(
  () => inputs.selectedOptionId,
  () => {
    inputs.number = 1
  }
)

const previousPage = () => {
  if (state.activeItem > 0) {
    state.activeItem--
  } else {
    if (store.hasViewsData) {
      store.selectedActionId = null
    }
  }
}

const ctaClick = () => {
  store.selectedActionId = selectedAction?.upsellId
}

const backToMenuClick = () => {
  store.selectedActionId = null
}
</script>

<template>
  <v-carousel
    v-model="state.activeItem"
    id="order-action"
    :data-action-id="selectedAction?.id"
    :show-arrows="false"
    :hide-delimiter-background="true"
    color="#705D0D"
    class="order-carousel"
  >
    <v-carousel-item :value="0" :disabled="!!state.activeItem">
      <v-list style="overflow-x: hidden">
        <!-- Cover Image -->
        <v-img
          v-if="selectedAction?.listImage"
          :src="gsToHttps(selectedAction.listImage)"
          height="202"
          cover
          class="order-cover-image mb-4"
        >
          <template v-slot:placeholder>
            <div class="order-image-loading">
              <div class="order-skeleton-shimmer"></div>
            </div>
          </template>

          <!-- Tags Overlay -->
          <div class="order-image-tags-container">
            <!-- Left Tags -->
            <div v-if="texts?.leftTags?.length" class="order-image-tags-left">
              <v-chip
                v-for="(tag, index) in texts.leftTags"
                :key="'left-' + index"
                size="small"
                class="order-image-tag"
              >
                <strong>{{ tag }}</strong>
              </v-chip>
            </div>

            <!-- Right Tags -->
            <div v-if="texts?.rightTags?.length" class="order-image-tags-right">
              <v-chip
                v-for="(tag, index) in texts.rightTags"
                :key="'right-' + index"
                size="small"
                class="order-image-tag"
              >
                <strong>{{ tag }}</strong>
              </v-chip>
            </div>
          </div>
        </v-img>

        <h1>{{ texts?.title }}</h1>
        <p v-if="texts?.text" class="pb-1">
          {{ texts?.text }}
        </p>
        <div v-if="texts?.texts" class="pb-1">
          <p v-for="(text, index) in texts?.texts" :key="index">
            {{ text }}
          </p>
        </div>

        <p v-if="texts?.selectionText" class="mb-0">
          {{ texts?.selectionText }}
        </p>

        <p v-if="areAllOptionsDisabled || isFullCapacity" class="error font-weight-bold">
          {{ texts?.reservationFull }}
        </p>

        <div v-if="areMultipleTimeTypes">
          <v-tabs v-model="state.tab" align-tabs="center" fixed-tabs>
            <v-tab
              v-for="(_, type) in reservationTimesGroupedByType"
              :key="type"
              :value="type"
              readonly
              >{{ capitalize(type) }}</v-tab
            >
          </v-tabs>

          <v-radio-group
            v-if="options?.selection"
            :model-value="
              inputs.selectedOptionId !== null && inputs.selectedDate !== null
                ? `${inputs.selectedOptionId}-${inputs.selectedDate}`
                : null
            "
            color="#705d0d"
          >
            <v-row>
              <v-col v-for="(typeGroup, type) in reservationTimesGroupedByType" :key="type">
                <v-radio
                  v-for="option in typeGroup"
                  :label="formatTimeRange(option)"
                  :value="`${option.id}-${option.currentDate}`"
                  :key="`${type}-${option.id}`"
                  :disabled="isOptionDisabled(option)"
                  @click="
                    () => {
                      if (!isOptionDisabled(option)) {
                        selectOption(option.id, option.currentDate)
                        state.tab = type
                      }
                    }
                  "
                ></v-radio>
              </v-col>
            </v-row>
          </v-radio-group>
        </div>

        <div v-else>
          <div v-if="options?.selection">
            <v-radio-group v-model="inputs.selectedOptionId" color="#705d0d">
              <v-radio
                v-for="(_, index) in reservationTimes"
                :label="formatTimeRange(index)"
                :value="index"
                :key="index"
                :disabled="isOptionDisabled(index)"
              ></v-radio>
            </v-radio-group>
          </div>
        </div>

        <div v-if="options?.checkbox">
          <v-checkbox
            v-for="(option, index) in texts?.checkboxes"
            v-model="inputs.checkboxes[index]"
            :key="index"
            :label="option"
          ></v-checkbox>
        </div>

        <div v-if="options?.inputNumber">
          <p>
            {{ texts?.numberInputText }}
          </p>
          <p
            v-if="!isReservationExclusive && isOptionSelected && freeCapacity !== maxCapacity"
            class="text-caption mb-2"
          >
            {{ texts?.availableCapacity }}: {{ freeCapacity }}
          </p>
          <v-number-input
            v-if="options?.inputNumber"
            v-model="inputs.number"
            :label="texts?.inputText"
            :hint="texts?.typeNumberText"
            class="pb-2"
            controlVariant="split"
            variant="outlined"
            :min="1"
            :max="freeCapacity"
            @blur="() => !inputs.number && (inputs.number = 1)"
            :readonly="!isOptionSelected"
          ></v-number-input>
        </div>

        <p v-if="texts?.bottomText" class="pb-1">
          {{ texts?.bottomText }}
        </p>

        <div v-if="options?.noteInput">
          <p>
            {{ texts?.noteText }}
          </p>
          <v-text-field
            v-model="inputs.text"
            :hint="texts?.typeNote"
            :label="texts?.noteInput"
            :rules="[!!inputs.text.length || texts.errorNote]"
            class="pb-2"
            variant="outlined"
            :maxlength="1000"
            :required="!!options?.noteRequired"
          ></v-text-field>
        </div>

        <div v-if="options?.noteInput2">
          <p>
            {{ texts?.noteText2 }}
          </p>
          <v-text-field
            v-model="inputs.text2"
            :hint="texts?.typeNote2"
            :label="texts?.noteInput2"
            :rules="[!!inputs.text2.length || texts.errorNote2]"
            class="pb-2"
            variant="outlined"
            :maxlength="1000"
            :required="!!options?.noteRequired2"
          ></v-text-field>
        </div>

        <div v-if="options?.emailInput">
          <p>
            {{ texts?.emailText }}
          </p>
          <v-text-field
            v-model="state.inputEmail"
            :label="texts?.emailInput"
            :hint="texts?.typeEmail"
            :rules="[isEmailCorrect || texts.errorEmail]"
            class="pb-3"
            variant="outlined"
            type="email"
            required
            maxlength="50"
          ></v-text-field>
        </div>

        <div v-if="options?.phoneInput">
          <p>
            {{ texts?.phoneText }}
          </p>
          <v-text-field
            v-model="state.inputPhone"
            :label="texts?.phoneInput"
            :hint="texts?.typePhone"
            :rules="[validatePhone(state.inputPhone) || texts.errorPhone]"
            class="pb-3"
            variant="outlined"
            type="tel"
            required
            maxlength="20"
          ></v-text-field>
        </div>

        <div class="text-end">
          <v-btn
            v-if="store.hasViewsData"
            id="back-button"
            variant="text"
            class="checkpoint-secondary-button"
            @click="previousPage"
            :disabled="state.loadingBtn"
          >
            {{ texts?.buttonBack }}
          </v-btn>
          <v-btn
            v-if="texts?.buttonOk"
            id="submit-button"
            variant="flat"
            class="checkpoint-button"
            :loading="state.loadingBtn"
            :disabled="
              isFullCapacity ||
              !isOptionSelected ||
              state.loadingBtn ||
              !isContactInfoValid ||
              (options?.noteRequired && !inputs.text) ||
              (options?.noteRequired2 && !inputs.text2)
            "
            @click="pushData"
          >
            <strong>{{ texts?.buttonOk }}</strong>
          </v-btn>
        </div>
      </v-list>
    </v-carousel-item>

    <v-carousel-item v-if="texts?.buttonOk" :value="1" :disabled="!state.activeItem">
      <div v-if="state.successPage" id="success-page">
        <h1 class="pb-0">{{ texts?.successTitle }}</h1>
        <v-list>
          <v-card v-if="texts?.reservation" class="mx-auto mb-5 pt-1 pb-2">
            <v-card-title>{{ texts?.reservation }}</v-card-title>
            <v-card-text>
              {{ reservationText }}
            </v-card-text>
          </v-card>
          <p v-if="texts?.successText" class="pb-5">
            {{ texts?.successText }}
          </p>
          <div v-if="texts?.successTexts" class="pb-5">
            <p v-for="(text, index) in texts?.successTexts" :key="index">
              {{ text }}
            </p>
          </div>
          <p v-if="store.hasViewsData && texts?.buttonCTA">
            {{ texts?.ctaText }}
          </p>
        </v-list>
      </div>
      <div v-if="store.hasViewsData" class="text-center">
        <v-btn
          v-if="texts?.buttonCTA"
          id="upsell-button"
          class="checkpoint-button"
          @click="ctaClick"
        >
          {{ texts?.buttonCTA }}
        </v-btn>
        <v-btn
          id="back-to-menu-button"
          variant="text"
          class="checkpoint-secondary-button mt-5 mb-12"
          @click="backToMenuClick"
        >
          {{ texts?.buttonBackMenu }}
        </v-btn>
      </div>
    </v-carousel-item>
  </v-carousel>
  <v-snackbar v-model="state.showError" rounded="pill">{{ state.error }}</v-snackbar>
</template>

<style scoped>
.order-carousel {
  padding-bottom: 80px;
  height: auto !important;
}

.order-carousel :deep(.v-carousel__controls) {
  display: none;
}

.order-carousel :deep(.v-window__container) {
  height: auto !important;
}

.order-carousel :deep(.v-window-item) {
  height: auto !important;
}

/* Order Cover Image */
.order-cover-image {
  border-radius: 10px;
  margin-bottom: 16px;
}

.order-image-loading {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 50%, #e0e0e0 100%);
  position: relative;
  overflow: hidden;
}

.order-skeleton-shimmer {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    transparent 40%,
    rgba(255, 255, 255, 0.5) 50%,
    transparent 60%,
    transparent 100%
  );
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}

/* Order Image Tags Overlay */
.order-image-tags-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding: 12px;
  pointer-events: none;
}

.order-image-tags-left,
.order-image-tags-right {
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: auto;
  align-items: flex-start;
}

.order-image-tags-right {
  align-items: flex-end;
}

.order-image-tag {
  background-color: var(--color-secondary-container) !important;
  color: var(--color-on-secondary-container) !important;
  font-family: 'Roboto', sans-serif !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  height: 24px !important;
  border-radius: 12px !important;
}
</style>
