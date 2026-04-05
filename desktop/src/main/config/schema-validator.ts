import * as fs from 'fs'
import * as path from 'path'
import Ajv, { type ErrorObject } from 'ajv'

export interface SchemaValidationResult {
  valid: boolean
  errors: string[]
}

// Resolve schema path relative to project root
// install/config-schema.json is at the repository root level
function getSchemaPath(): string {
  // In production (packaged app), the schema may be in different locations
  // Try multiple paths: relative to this file, relative to process.cwd(), etc.
  const candidates = [
    path.resolve(__dirname, '../../../../install/config-schema.json'),
    path.resolve(__dirname, '../../../install/config-schema.json'),
    path.resolve(__dirname, '../../install/config-schema.json'),
    path.resolve(process.cwd(), 'install/config-schema.json'),
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  // Fallback: return the most likely path (will error at read time if missing)
  return candidates[0]
}

let cachedSchema: Record<string, unknown> | null = null
let cachedValidate: ReturnType<Ajv['compile']> | null = null

function loadSchema(): Record<string, unknown> {
  if (cachedSchema) return cachedSchema

  const schemaPath = getSchemaPath()
  const content = fs.readFileSync(schemaPath, 'utf8')
  cachedSchema = JSON.parse(content) as Record<string, unknown>
  return cachedSchema
}

function getValidator(): ReturnType<Ajv['compile']> {
  if (cachedValidate) return cachedValidate

  const schema = loadSchema()
  const ajv = new Ajv({
    allErrors: true,
    verbose: true,
  })
  cachedValidate = ajv.compile(schema)
  return cachedValidate
}

/**
 * Formats a single ajv error into a human-readable message.
 */
function formatError(error: ErrorObject): string {
  const dataPath = error.instancePath || ''
  const field = dataPath.replace(/^\//, '').replace(/\//g, '.')

  switch (error.keyword) {
    case 'required': {
      const missingProp = error.params?.missingProperty as string | undefined
      return `${field || 'config'}: missing required field "${missingProp}"`
    }

    case 'type': {
      const expected = error.params?.type as string | undefined
      return `${field}: must be of type ${expected}`
    }

    case 'enum': {
      const allowed = (error.params?.allowedValues as string[] | undefined) ?? []
      const got = error.data
      return `${field}: must be one of ${JSON.stringify(allowed)}, got ${JSON.stringify(got)}`
    }

    case 'pattern': {
      const pattern = error.params?.pattern as string | undefined
      if (field.endsWith('.path') || field === 'path') {
        return `${field}: must be an absolute path (starts with / or ~), got ${JSON.stringify(error.data)}`
      }
      if (field === 'version') {
        return `${field}: must be a semver string (e.g. "1.0.0"), got ${JSON.stringify(error.data)}`
      }
      return `${field}: must match pattern ${pattern}`
    }

    case 'minItems': {
      const min = error.params?.limit as number | undefined
      return `${field}: must contain at least ${min} item(s)`
    }

    case 'minProperties': {
      const min = error.params?.limit as number | undefined
      return `${field}: must contain at least ${min} entry/entries`
    }

    case 'minLength': {
      return `${field}: must be a non-empty string`
    }

    case 'additionalProperties': {
      const extra = error.params?.additionalProperty as string | undefined
      return `${field || 'config'}: unknown property "${extra}"`
    }

    default:
      return `${field || 'config'}: ${error.message || 'validation error'}`
  }
}

/**
 * Validates a config object against the Magic Slash JSON Schema.
 *
 * @param config - The parsed config object to validate
 * @returns An object with `valid` (boolean) and `errors` (human-readable messages)
 */
export function validateConfig(config: unknown): SchemaValidationResult {
  try {
    const validate = getValidator()
    const valid = validate(config)

    if (valid) {
      return { valid: true, errors: [] }
    }

    const errors = (validate.errors || []).map(formatError)
    return { valid: false, errors }
  } catch (err) {
    // If schema file cannot be loaded, treat as non-fatal
    const message = err instanceof Error ? err.message : String(err)
    return {
      valid: false,
      errors: [`Failed to load or compile config schema: ${message}`],
    }
  }
}

/**
 * Checks whether validation errors include critical issues
 * (missing required top-level fields like version or repositories).
 */
export function hasCriticalErrors(errors: string[]): boolean {
  return errors.some(
    (e) =>
      e.startsWith('config: missing required field "version"') ||
      e.startsWith('config: missing required field "repositories"')
  )
}
