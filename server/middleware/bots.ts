import {
  defineEventHandler,
  getRequestHeader,
  getRequestURL,
  setResponseHeader,
  setResponseStatus,
} from 'h3'
import type { H3Event } from 'h3'
import { isBlockedUserAgent, isScannerPath } from '#shared/utils/bots'

function refuse(event: H3Event, status: number, message: string) {
  setResponseStatus(event, status)
  setResponseHeader(event, 'Content-Type', 'text/plain; charset=utf-8')

  return message
}

export default defineEventHandler(event => {
  if (isBlockedUserAgent(getRequestHeader(event, 'user-agent'))) {
    return refuse(event, 403, 'Forbidden')
  }

  if (isScannerPath(getRequestURL(event).pathname)) {
    return refuse(event, 404, 'Not found')
  }
})
