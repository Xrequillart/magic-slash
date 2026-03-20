import { describe, it, expect } from 'vitest'
import { parseStreamLines } from './streamJsonParser'

describe('parseStreamLines', () => {
  it('parses a single complete JSON line', () => {
    const { events, remaining } = parseStreamLines('', '{"type":"message_start","message":{"id":"msg_1","type":"message","role":"assistant","model":"claude-4"}}\n')
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('message_start')
    expect(remaining).toBe('')
  })

  it('parses multiple JSON lines in one chunk', () => {
    const input = [
      '{"type":"content_block_start","index":0,"content_block":{"type":"text"}}',
      '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}',
      '{"type":"content_block_stop","index":0}',
      '',
    ].join('\n')

    const { events, remaining } = parseStreamLines('', input)
    expect(events).toHaveLength(3)
    expect(events[0].type).toBe('content_block_start')
    expect(events[1].type).toBe('content_block_delta')
    expect(events[2].type).toBe('content_block_stop')
    expect(remaining).toBe('')
  })

  it('buffers incomplete lines across chunks', () => {
    const fullLine = '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello world"}}'
    const part1 = fullLine.slice(0, 40)
    const part2 = fullLine.slice(40) + '\n'

    // First chunk: partial line, no events
    const result1 = parseStreamLines('', part1)
    expect(result1.events).toHaveLength(0)
    expect(result1.remaining).toBe(part1)

    // Second chunk: completes the line
    const result2 = parseStreamLines(result1.remaining, part2)
    expect(result2.events).toHaveLength(1)
    expect(result2.events[0].type).toBe('content_block_delta')
    expect(result2.remaining).toBe('')
  })

  it('ignores non-JSON lines (ANSI escape sequences)', () => {
    const input = '\x1b[2J\x1b[H\n{"type":"system","subtype":"init"}\nsome random text\n'
    const { events } = parseStreamLines('', input)
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('system')
  })

  it('ignores empty lines', () => {
    const input = '\n\n{"type":"message_stop"}\n\n'
    const { events } = parseStreamLines('', input)
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('message_stop')
  })

  it('ignores JSON without a type field', () => {
    const input = '{"foo":"bar"}\n{"type":"error","error":{"type":"api_error","message":"fail"}}\n'
    const { events } = parseStreamLines('', input)
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('error')
  })

  it('handles all major event types', () => {
    const eventLines = [
      '{"type":"message_start","message":{"id":"m1","type":"message","role":"assistant","model":"claude-4"}}',
      '{"type":"content_block_start","index":0,"content_block":{"type":"text"}}',
      '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hi"}}',
      '{"type":"content_block_stop","index":0}',
      '{"type":"content_block_start","index":1,"content_block":{"type":"tool_use","id":"tu_1","name":"Read"}}',
      '{"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":"{\\"path\\""}}',
      '{"type":"content_block_stop","index":1}',
      '{"type":"message_delta","delta":{"stop_reason":"end_turn"}}',
      '{"type":"message_stop"}',
      '{"type":"result","subtype":"success","cost_usd":0.01,"duration_ms":1500}',
      '',
    ].join('\n')

    const { events } = parseStreamLines('', eventLines)
    expect(events).toHaveLength(10)
    expect(events.map(e => e.type)).toEqual([
      'message_start',
      'content_block_start',
      'content_block_delta',
      'content_block_stop',
      'content_block_start',
      'content_block_delta',
      'content_block_stop',
      'message_delta',
      'message_stop',
      'result',
    ])
  })

  it('handles malformed JSON gracefully', () => {
    const input = '{broken json\n{"type":"message_stop"}\n{also broken}\n'
    const { events } = parseStreamLines('', input)
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('message_stop')
  })

  it('preserves remaining buffer when input does not end with newline', () => {
    const input = '{"type":"message_stop"}\n{"type":"partial'
    const { events, remaining } = parseStreamLines('', input)
    expect(events).toHaveLength(1)
    expect(remaining).toBe('{"type":"partial')
  })

  it('works with empty input', () => {
    const { events, remaining } = parseStreamLines('', '')
    expect(events).toHaveLength(0)
    expect(remaining).toBe('')
  })

  it('works with only a newline', () => {
    const { events, remaining } = parseStreamLines('', '\n')
    expect(events).toHaveLength(0)
    expect(remaining).toBe('')
  })
})
