export interface ListPickerConfig {
  label: string
  endpoint: string
  noun: string
  id: string
}

export interface FetchFailure {
  statusMessage?: string
  data?: { data?: { errors?: Record<string, string> } }
}
