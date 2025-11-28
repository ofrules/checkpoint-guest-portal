<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

import { validatePhone, validateEmail } from '@/helpers'
import store from '@/store'
import * as types from '@/types'
import { gsToHttps } from '@/helpers/firebase-storage'

const route = useRoute()

const endpointUrl = `${__API_URL__}/createExtUserOrder`
const getDataUrl = `${__API_URL__}/extFeedbackActionData`

const { selectedAction } = store

const state = reactive({
  activeItem: 0,
  successPage: false,
  loadingBtn: false,
  error: '',
  showError: false,
  inputPhone: store.userPhone || '',
  inputEmail: store.userEmail || '',
  tab: null as any
})

const inputs = reactive({
  number: 1,
  text: '',
  text2: '',
  selectedOptionId: null as number | null,
  checkboxes: {} as any
})

const options = selectedAction.options
const reservation = selectedAction?.reservation
const reservationTimes = reservation?.times as types.ReservationTime[]
const isReservationExclusive = !!reservation?.exclusive
const isReservationWithCapacity = !!reservation?.capacity
const areMultipleTimeTypes = !!reservation?.multipleTimeTypes

const reservationDate = (() => {
  if (isReservationExclusive || isReservationWithCapacity) {
    const date = new Date()
    if (reservation?.type === 'tomorrow') {
      date.setDate(date.getDate() + 1)
    }
    return date.toLocaleDateString('sk-SK').replace(/\s/g, '')
  } else {
    return null
  }
})()

const reservationTimesGroupedByType = reservationTimes?.reduce(
  (acc, time, id) => {
    if (!acc[time.type]) {
      acc[time.type] = []
    }
    acc[time.type].push({ ...time, id })
    return acc
  },
  {} as Record<string, (types.ReservationTime & { id: number })[]>
)

const texts = computed(() => selectedAction?.texts?.[store.chosenLang] as types.OrderAction)
const reservationText = computed(() => {
  let text = texts.value?.reservationText!
  const textInputs = createTextInputs()
  textInputs?.forEach((input, index) => {
    text = text?.replace(`$${index + 1}`, input ?? '')
  })
  return text
})

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
const isFullCapacity = computed(() => {
  if (isReservationWithCapacity && reservationDate === reservation?.dateReserved) {
    return !reservation?.freeCapacity
  }
  return false
})
const freeCapacity = computed(() => {
  if (isReservationWithCapacity) {
    if (reservationDate === reservation?.dateReserved) {
      return reservation?.freeCapacity
    } else {
      return reservation?.capacity
    }
  }
  return 30
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

const formatTimeRange = (index: number) => {
  const time = reservationTimes?.[index]
  return time?.start + (time?.end ? ` - ${time.end}` : '')
}

const createPostInputs = () => {
  const postInputs = []
  if (options?.selection) {
    // postInputs.push(
    //   selectedAction?.texts?.[store.buildingData?.language ?? 'sk']?.selectOptions?.[
    //     inputs.selectedOption!
    //   ]
    // )
    postInputs.push(formatTimeRange(inputs.selectedOptionId!))
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
  return postInputs
}

const createTextInputs = () => {
  const textInputs = []
  if (options?.selection) {
    textInputs.push(formatTimeRange(inputs.selectedOptionId!))
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
  return textInputs
}

const pushData = async () => {
  state.loadingBtn = true
  const note = inputs.text2.length ? `${inputs.text}, ${inputs.text2}` : inputs.text
  axios
    .post(endpointUrl, {
      buildingId: store.buildingId,
      checkpointId: store.userRoomId ?? store.checkpointId,
      extActionPath: selectedAction?.path,
      selectedOption: inputs.selectedOptionId,
      selectedNumber: isReservationWithCapacity ? inputs.number : undefined,
      inputs: createPostInputs(),
      note: note,
      phone: state.inputPhone || undefined,
      email: state.inputEmail || undefined
    })
    .then(function (response) {
      store.extUserActionId = response.data?.data
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

const isOptionReserved = (index: number) =>
  isReservationExclusive && reservationTimes?.[index]?.dateReserved === reservationDate

const isOptionAfterStartTime = (index: number) => {
  const optionStartTime = reservationTimes?.[index]?.start
  if (optionStartTime && reservation?.type === 'today') {
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

const isOptionDisabled = (index: number) => {
  if (reservation) {
    return isOptionReserved(index) || isOptionAfterStartTime(index)
  } else {
    return false
  }
}

watch(
  () => inputs.number,
  () => {
    if (inputs.number && inputs.number < 1) {
      inputs.number = 1
    }
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
              >{{ type }}</v-tab
            >
          </v-tabs>

          <v-row v-if="options?.selection">
            <v-col v-for="(typeGroup, type) in reservationTimesGroupedByType" :key="type">
              <v-radio-group v-model="inputs.selectedOptionId" color="#705d0d">
                <v-radio
                  v-for="option in typeGroup"
                  :label="formatTimeRange(option.id)"
                  :value="option.id"
                  :key="option.id"
                  :disabled="isOptionDisabled(option.id)"
                  @click="() => (state.tab = type)"
                ></v-radio>
              </v-radio-group>
            </v-col>
          </v-row>
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
