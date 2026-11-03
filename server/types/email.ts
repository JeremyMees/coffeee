export type EmailValues = {
  VerifyEmail: { name: string; link: string }
  ResetPassword: { name: string; link: string }
}

export type EmailTemplate = keyof EmailValues

export interface Email<Template extends EmailTemplate = EmailTemplate> {
  to: string
  subject: string
  template: Template
  values: EmailValues[Template]
}
