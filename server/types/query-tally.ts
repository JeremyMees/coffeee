export interface QueryTally {
  queries: number
  milliseconds: number
}

declare module 'h3' {
  interface H3EventContext {
    queryTally?: QueryTally
  }
}
