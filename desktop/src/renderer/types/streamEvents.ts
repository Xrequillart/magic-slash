// Stream-JSON event types for Claude Code --output-format stream-json
// See: https://docs.anthropic.com/en/docs/build-with-claude/claude-code/streaming

export interface MessageStart {
  type: 'message_start'
  message: {
    id: string
    type: 'message'
    role: 'assistant'
    model: string
    usage?: {
      input_tokens: number
      output_tokens: number
      cache_creation_input_tokens?: number
      cache_read_input_tokens?: number
    }
  }
}

export interface MessageDelta {
  type: 'message_delta'
  delta: {
    stop_reason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence' | null
  }
  usage?: {
    output_tokens: number
  }
}

export interface MessageStop {
  type: 'message_stop'
}

export interface ContentBlockStart {
  type: 'content_block_start'
  index: number
  content_block: {
    type: 'text' | 'tool_use'
    text?: string
    id?: string
    name?: string
    input?: Record<string, unknown>
  }
}

export interface ContentBlockDelta {
  type: 'content_block_delta'
  index: number
  delta: {
    type: 'text_delta' | 'input_json_delta'
    text?: string
    partial_json?: string
  }
}

export interface ContentBlockStop {
  type: 'content_block_stop'
  index: number
}

export interface SystemEvent {
  type: 'system'
  subtype: string
  message?: string
  [key: string]: unknown
}

export interface ResultEvent {
  type: 'result'
  subtype: 'success' | 'error'
  result?: string
  cost_usd?: number
  duration_ms?: number
  duration_api_ms?: number
  num_turns?: number
  is_error?: boolean
  session_id?: string
}

export interface ErrorEvent {
  type: 'error'
  error: {
    type: string
    message: string
  }
}

export type StreamEvent =
  | MessageStart
  | MessageDelta
  | MessageStop
  | ContentBlockStart
  | ContentBlockDelta
  | ContentBlockStop
  | SystemEvent
  | ResultEvent
  | ErrorEvent
