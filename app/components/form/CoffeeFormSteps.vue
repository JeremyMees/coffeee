<script setup lang="ts">
import { CheckIcon } from '@lucide/vue'
import { useFormErrors } from 'vee-validate'

const props = defineProps<{ steps: FormStep[]; prefix: string }>()

const step = defineModel<number>({ required: true })
const errors = useFormErrors()

const failing = computed(() =>
  props.steps.map(item =>
    stepHasError(
      item,
      Object.keys(errors.value).filter(field => errors.value[field]),
    ),
  ),
)
const first = computed(() => step.value === 1)
const last = computed(() => step.value === props.steps.length)
const nextTitle = computed(() => props.steps[step.value]?.title)
</script>

<template>
  <div class="flex flex-col gap-6">
    <Stepper
      v-model="step"
      :linear="false"
      class="flex w-full items-start gap-2"
      :data-testid="`${prefix}-steps`"
    >
      <StepperItem
        v-for="(item, index) in steps"
        :key="item.title"
        :step="index + 1"
        class="relative flex flex-1 flex-col items-center"
        :data-testid="`${prefix}-step-${index + 1}`"
        :data-failing="failing[index] || undefined"
      >
        <StepperSeparator
          v-if="index < steps.length - 1"
          class="absolute top-4 right-[calc(-50%+20px)] left-[calc(50%+20px)] block h-px shrink-0 bg-primary/30"
        />
        <StepperTrigger class="flex flex-col items-center gap-1.5 p-0">
          <StepperIndicator
            :class="[
              'size-8 border text-xs',
              failing[index]
                ? 'border-destructive text-destructive group-data-[state=active]:bg-destructive group-data-[state=active]:text-white'
                : 'border-primary text-primary group-data-[state=active]:bg-primary group-data-[state=active]:text-primary-foreground group-data-[state=completed]:bg-primary group-data-[state=completed]:text-primary-foreground',
            ]"
          >
            <span v-if="failing[index]">!</span>
            <CheckIcon
              v-else-if="index + 1 < step"
              class="size-4"
              aria-hidden="true"
            />
            <span v-else>{{ index + 1 }}</span>
          </StepperIndicator>
          <StepperTitle
            :class="[
              'text-[11px] font-normal uppercase group-data-[state=inactive]:opacity-60',
              failing[index] ? 'text-destructive' : 'text-primary',
            ]"
          >
            {{ item.title }}
          </StepperTitle>
        </StepperTrigger>
      </StepperItem>
    </Stepper>

    <FieldGroup
      v-show="step === 1"
      data-pane="1"
      :data-testid="`${prefix}-pane-1`"
    >
      <slot name="photo" />
      <CoffeeIdentityFields />
    </FieldGroup>
    <FieldGroup
      v-show="step === 2"
      data-pane="2"
      :data-testid="`${prefix}-pane-2`"
    >
      <CoffeeOriginFields />
      <DescriptionListFields :fields="['producers']" />
    </FieldGroup>
    <FieldGroup
      v-show="step === 3"
      data-pane="3"
      :data-testid="`${prefix}-pane-3`"
    >
      <DescriptionListFields
        :fields="['processes', 'varietals', 'flavorNotes']"
      />
      <CoffeeRoastFields />
    </FieldGroup>
    <FieldGroup
      v-if="steps.length > 3"
      v-show="step === 4"
      data-pane="4"
      :data-testid="`${prefix}-pane-4`"
    >
      <PurchaseFields />
    </FieldGroup>

    <slot name="error" />

    <div class="flex items-center gap-3">
      <Button
        v-if="!first"
        type="button"
        :data-testid="`${prefix}-back`"
        variant="outline"
        @click="step -= 1"
      >
        Back
      </Button>
      <slot v-if="last" name="submit" />
      <Button
        v-else
        type="button"
        :data-testid="`${prefix}-next`"
        class="flex-1"
        @click="step += 1"
      >
        Next: {{ nextTitle }}
      </Button>
    </div>
  </div>
</template>
