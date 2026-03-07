<script setup lang="ts">
import { reactive, computed } from 'vue'
import axios from 'axios'

import store from '@/store'
import * as types from '@/types'
import { trackActionCompleted } from '@/helpers/analytics'

const options = store.selectedAction?.options
const showContactPage = !!options?.contactPage

const state = reactive({
  activeItem: 0,
  successPage: false,
  loadingBtn: false,
  inputScore: 0,
  inputNote: '',
  inputEmail: '',
  error: '',
  showError: false,
  inputScoreError: false,
  emailCorrect: true,
  isNegativeRating: false,
  selectedChoices: Array.from({ length: options?.numberQuestions?.positive }, () => []) as any[],
  selectedChoicesInput: Array.from(
    { length: options?.numberQuestions?.positive },
    () => []
  ) as any[],
  historySelectedChoicesInput: Array.from(
    { length: options?.numberQuestions?.positive },
    () => []
  ) as any[],
  otherInputs: Array(options?.numberQuestions?.positive).fill('') as any[]
})

const isScoreFilled = computed(() => state.inputScore > 0)
const text = computed(() => store.selectedAction?.texts?.[store.chosenLang] as types.ReviewAction)
const questionFormsText = computed(() =>
  !state.isNegativeRating ? text.value?.positiveQuestions : text.value?.negativeQuestions
)
const numberOfQuestions = computed(() =>
  !state.isNegativeRating ? options?.numberQuestions?.positive : options?.numberQuestions?.negative
)

const endpointUrl = `${__API_URL__}/createExtUserReview`

const pushData = () => {
  const rules = [validateInputScore]
  if (!rules.every((rule) => rule())) {
    return
  }
  state.loadingBtn = true
  axios
    .post(endpointUrl, {
      buildingId: store.buildingId,
      checkpointId: store.userRoomId ?? store.checkpointId,
      extActionPath: store.selectedAction?.path,
      score: state.inputScore,
      note: state.inputNote,
      questionnaire: dataToQuestionnairePost(),
      email: state.inputEmail !== '' ? state.inputEmail : undefined
    })
    .then(function (response) {
      store.extUserActionId = response.data
      trackActionCompleted('review', store.selectedAction?.id, { score: state.inputScore })
      if (state.inputScore < 4) {
        state.successPage = false
      } else {
        state.successPage = true
      }
      nextPage()
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

const validateInputScore = () => {
  const value = state.inputScore
  if (value === null || value === undefined || isNaN(value)) {
    state.inputScoreError = true
    return false
  }
  state.inputScoreError = false
  return true
}

const validateEmail = () => {
  const email = state.inputEmail
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  state.emailCorrect = emailPattern.test(email) || !email.length
  return state.emailCorrect || text.value?.errorEmail
}

const previousPage = () => {
  if (state.activeItem > 0) {
    state.activeItem--
  } else {
    if (store.hasViewsData) {
      store.selectedActionId = null
    }
  }
}

const goToPage = (url: string | undefined) => {
  window.location.href = url ?? '/'
}

const resetChoicesAndInputs = () => {
  state.selectedChoices = Array.from({ length: numberOfQuestions.value }, () => [])
  state.selectedChoicesInput = Array.from({ length: numberOfQuestions.value }, () => [])
  state.historySelectedChoicesInput = Array.from({ length: numberOfQuestions.value }, () => [])
  state.otherInputs = new Array(numberOfQuestions.value).fill('')
}

const dataToQuestionnairePost = () => {
  return state.selectedChoices.map((questionChoices, index) => {
    const questionForm = questionFormsText.value?.[index] as any
    const question = questionForm.question
    const choicesInput = state.selectedChoicesInput[index].filter(() => true)
    return {
      question: question,
      answers: questionChoices.sort().map((choice: number, indexChoice: number) => ({
        choice: questionForm.choices[choice],
        input: choicesInput[indexChoice] ?? undefined
      })),
      otherInput: state.otherInputs[index]
    }
  })
}

const nextPage = () => {
  if (state.activeItem == 0) {
    if (state.inputScore < 4) {
      if (state.isNegativeRating != true) {
        state.isNegativeRating = true
        resetChoicesAndInputs()
      }
    } else {
      if (state.isNegativeRating != false) {
        state.isNegativeRating = false
        resetChoicesAndInputs()
      }
    }
  }
  state.activeItem++
}

const ctaClick = () => {
  if (store.buildingData?.googleUrl) {
    goToPage(store.buildingData?.googleUrl)
  } else {
    goToPage(store.buildingData?.website)
  }
}

const backToMenuClick = () => {
  store.selectedActionId = null
}

const choiceChoosen = (indexQuestion: number, indexChoice: number) => {
  const wasChecked = state.selectedChoices[indexQuestion].includes(indexChoice)
  if (wasChecked) {
    state.historySelectedChoicesInput[indexQuestion][indexChoice] =
      state.selectedChoicesInput[indexQuestion][indexChoice]
    delete state.selectedChoicesInput[indexQuestion][indexChoice]
  } else {
    state.selectedChoicesInput[indexQuestion][indexChoice] =
      state.historySelectedChoicesInput[indexQuestion][indexChoice]
  }
}
</script>

<template>
  <v-carousel
    v-model="state.activeItem"
    id="review-action"
    :data-action-id="store.selectedAction?.id"
    :show-arrows="false"
    :hide-delimiter-background="true"
    color="#705D0D"
    height="90vh"
  >
    <v-carousel-item :value="0" :disabled="state.activeItem !== 0">
      <h1 class="pb-5">{{ text?.title }}</h1>
      <p class="pb-1">
        {{ text?.text }}
      </p>
      <p v-if="text?.textQuestion" class="fw-bold">{{ text?.textQuestion }}</p>
      <div class="text-center py-2">
        <v-rating v-model="state.inputScore" density="default" hover></v-rating>
      </div>
      <span v-if="state.inputScoreError" class="error">*{{ text?.requiredScore }}</span>
      <v-text-field
        v-if="!options?.hiddenRatingQuestion"
        v-model="state.inputNote"
        :label="text?.inputText"
        :hint="text?.typeText"
        class="py-5"
        variant="outlined"
        type="text"
        maxlength="1000"
      ></v-text-field>
      <div v-else class="py-3"></div>
      <div class="text-end">
        <v-btn
          v-if="store.hasViewsData"
          id="back-button"
          variant="text"
          class="checkpoint-secondary-button"
          @click="previousPage"
          :disabled="state.loadingBtn"
        >
          {{ text?.buttonBack }}
        </v-btn>
        <v-btn
          id="next-button"
          variant="flat"
          class="checkpoint-button"
          :loading="state.loadingBtn"
          @click="nextPage"
          :disabled="!isScoreFilled"
        >
          {{ text?.buttonNext }}
        </v-btn>
      </div>
    </v-carousel-item>

    <v-carousel-item
      v-for="(questionForm, index) in questionFormsText"
      :key="index + 1"
      :value="index + 1"
      :disabled="state.activeItem !== index + 1"
    >
      <v-list max-height="75vh">
        <p class="pb-1 fw-bold">{{ (questionForm as any)?.question }}</p>
        <div
          v-for="(choice, indexChoice) in (questionForm as any)?.choices"
          :key="indexChoice"
          class="pb-2"
        >
          <v-checkbox
            :value="indexChoice"
            v-model="state.selectedChoices[index]"
            :label="choice"
            color="#705d0d"
            hide-details
            @click="() => choiceChoosen(index, indexChoice)"
          ></v-checkbox>
          <v-text-field
            v-if="
              (questionForm as any)?.elaborateChoice &&
              state.selectedChoices[index].includes(indexChoice)
            "
            v-model="state.selectedChoicesInput[index][indexChoice]"
            :label="(questionForm as any)?.elaborateInput"
            :hint="(questionForm as any)?.elaborateText"
            variant="outlined"
            type="text"
            maxlength="1000"
          ></v-text-field>
        </div>

        <v-text-field
          v-model="state.otherInputs[index]"
          :label="(questionForm as any)?.otherInput"
          :hint="(questionForm as any)?.otherText"
          class="py-5"
          variant="outlined"
          type="text"
          maxlength="1000"
        ></v-text-field>
        <div class="text-end">
          <v-btn
            id="back-button"
            variant="text"
            class="checkpoint-secondary-button"
            @click="previousPage"
            :disabled="state.loadingBtn"
          >
            {{ text?.buttonBack }}
          </v-btn>
          <v-btn
            v-if="index + 1 < numberOfQuestions || showContactPage"
            id="next-button"
            variant="flat"
            class="checkpoint-button"
            @click="nextPage"
          >
            {{ text?.buttonNext }}
          </v-btn>
          <v-btn
            v-else
            id="submit-button"
            variant="flat"
            class="checkpoint-button"
            :loading="state.loadingBtn"
            @click="pushData"
          >
            {{ text?.buttonOk }}
          </v-btn>
        </div>
      </v-list>
    </v-carousel-item>

    <v-carousel-item
      v-if="showContactPage"
      :value="numberOfQuestions + 1"
      :disabled="state.activeItem !== numberOfQuestions + 1"
    >
      <div v-if="!state.isNegativeRating">
        <p v-if="text?.contactPositiveTitle" class="pb-5 fw-bold">
          {{ text?.contactPositiveTitle }}
        </p>
        <p v-if="text?.contactPositiveText" class="">{{ text?.contactPositiveText }}</p>
      </div>
      <div v-else>
        <p v-if="text?.contactNegativeTitle" class="pb-2 fw-bold">
          {{ text?.contactNegativeTitle }}
        </p>
        <p v-if="text?.contactNegativeText" class="">{{ text?.contactNegativeText }}</p>
      </div>
      <v-text-field
        v-model="state.inputEmail"
        :label="text?.mailText"
        :hint="text?.typeEmail"
        :rules="[validateEmail]"
        class="py-3"
        variant="outlined"
        type="email"
        required
        maxlength="50"
      ></v-text-field>
      <div class="text-end">
        <v-btn
          id="back-button"
          variant="text"
          class="checkpoint-secondary-button"
          @click="previousPage"
          :disabled="state.loadingBtn"
        >
          {{ text?.buttonBack }}
        </v-btn>
        <v-btn
          id="submit-button"
          variant="flat"
          class="checkpoint-button"
          :loading="state.loadingBtn"
          :disabled="!state.emailCorrect"
          @click="pushData"
        >
          {{ text?.buttonOk }}
        </v-btn>
      </div>
    </v-carousel-item>

    <v-carousel-item
      :value="numberOfQuestions + 1 + showContactPage"
      :disabled="state.activeItem !== numberOfQuestions + 1 + showContactPage"
      content-class="pb-16"
    >
      <div v-if="state.successPage" id="success-page">
        <h1 class="py-10">{{ text?.successTitle }}</h1>
        <p class="pb-10">
          {{ text?.successText }}
        </p>
        <div class="text-center">
          <v-btn id="upsell-button" class="checkpoint-button" @click="ctaClick">
            {{ text?.buttonCTA }}
          </v-btn>
        </div>
      </div>
      <div v-else id="success-page">
        <h1 class="py-10">{{ text?.cancelTitle }}</h1>
        <p>
          {{ text?.cancelText }}
        </p>
      </div>
      <div v-if="store.hasViewsData" class="text-center">
        <v-btn
          id="back-to-menu-button"
          variant="text"
          class="checkpoint-secondary-button mt-5"
          @click="backToMenuClick"
        >
          {{ text?.buttonBackMenu }}
        </v-btn>
      </div>
    </v-carousel-item>
  </v-carousel>
  <v-snackbar v-model="state.showError" rounded="pill">{{ state.error }}</v-snackbar>
</template>

<style lang="scss">
.v-rating__wrapper {
  padding: 5px;
}

.v-rating__item .v-btn .v-icon {
  color: #705d0d;
}
</style>
