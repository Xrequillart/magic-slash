// Stream-JSON event types for Claude Code `claude -p --output-format stream-json --verbose`
// These match the ACTUAL Claude Code CLI output format (not the Anthropic API format)

export interface SystemEvent {
  type: 'system'
  subtype: string // 'init' | 'hook_started' | 'hook_response' | 'tool_use_permission' | ...
  session_id?: string
  message?: string
  tools?: string[]
  model?: string
  claude_code_version?: string
  [key: string]: unknown
}

export interface AssistantEvent {
  type: 'assistant'
  message: {
    model: string
    id: string
    type: 'message'
    role: 'assistant'
    content: Array<{
      type: 'text' | 'tool_use' | 'tool_result'
      text?: string
      id?: string
      name?: string
      input?: Record<string, unknown>
    }>
    stop_reason: string | null
    usage?: {
      input_tokens: number
      output_tokens: number
      cache_creation_input_tokens?: number
      cache_read_input_tokens?: number
      [key: string]: unknown
    }
    [key: string]: unknown
  }
  session_id?: string
  [key: string]: unknown
}

export interface ResultEvent {
  type: 'result'
  subtype: 'success' | 'error'
  is_error?: boolean
  result?: string
  duration_ms?: number
  duration_api_ms?: number
  num_turns?: number
  session_id?: string
  total_cost_usd?: number
  usage?: Record<string, unknown>
  [key: string]: unknown
}

export interface ErrorEvent {
  type: 'error'
  error: {
    type: string
    message: string
  }
}

// Legacy Anthropic API-style events (kept for compatibility)
export interface MessageStart {
  type: 'message_start'
  message: {
    id: string
    type: 'message'
    role: 'assistant'
    model: string
    usage?: Record<string, number>
  }
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

export type StreamEvent =
  | SystemEvent
  | AssistantEvent
  | ResultEvent
  | ErrorEvent
  | MessageStart
  | ContentBlockStart
  | ContentBlockDelta
  | { type: string; [key: string]: unknown } // catch-all for unknown event types
