import { defineEventHandler, toWebRequest } from 'h3'
import { useAuth } from '#server/utils/auth'

export default defineEventHandler(event =>
  useAuth().handler(toWebRequest(event)),
)
