/**
 * Índice de exportações do sistema de segurança
 */

// SQL Injection Protection
export {
  detectSQLInjectionAttempt,
  sanitizeString,
  sanitizeObject,
  escapeString,
  validateAndSanitizeInput,
  type SanitizationOptions,
} from './sqlInjectionProtection';

// Audit Logger
export {
  AuditLogger,
  auditLogger,
  type AuditLog,
  type AuditConfig,
} from './auditLogger';

// Compliance Validator
export {
  ComplianceValidator,
  complianceRules,
  cpfSchema,
  cnpjSchema,
  emailSchema,
  phoneSchema,
  passwordSchema,
  dateSchema,
  type ComplianceRule,
  type ValidationResult,
} from './complianceValidator';

// Rate Limiting & Timeout
export {
  RateLimiter,
  TimeoutManager,
  apiRateLimiter,
  authRateLimiter,
  uploadRateLimiter,
  dbRateLimiter,
  DEFAULT_RATE_LIMITS,
  type RateLimitConfig,
} from './rateLimiting';

// Secure Supabase Client
export {
  SecureSupabaseClient,
  secureSupabase,
  type SecureQueryOptions,
} from './secureSupabase';
