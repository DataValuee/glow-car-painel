/**
 * Proteção contra SQL Injection e validação de entrada
 */

import { z } from 'zod';

/**
 * Padrões perigosos que indicam possível SQL injection
 */
const DANGEROUS_PATTERNS = [
  /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|SCRIPT)\b)/gi,
  /(-{2})/g, // SQL comments
  /(\/\*|\*\/)/g, // SQL block comments
  /(;)/g, // Command terminator
  /(\bOR\b.*=.*)/gi,
  /(\bAND\b.*=.*)/gi,
  /(xp_|sp_)/gi, // Stored procedures
  /(<script|javascript:|onerror|onclick)/gi, // XSS attempts
];

export interface SanitizationOptions {
  allowHtml?: boolean;
  maxLength?: number;
  pattern?: RegExp;
}

/**
 * Detecta possíveis tentativas de SQL injection
 */
export function detectSQLInjectionAttempt(input: string): boolean {
  if (typeof input !== 'string') return false;
  
  return DANGEROUS_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * Sanitiza strings para prevenir SQL injection
 */
export function sanitizeString(
  input: string,
  options: SanitizationOptions = {}
): string {
  if (typeof input !== 'string') return '';
  
  let sanitized = input;
  
  // Remover caracteres especiais de SQL
  if (!options.allowHtml) {
    sanitized = sanitized.replace(/[<>\"'%]/g, '');
  }
  
  // Aplicar limite de comprimento
  if (options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }
  
  // Aplicar padrão customizado se fornecido
  if (options.pattern) {
    sanitized = sanitized.replace(options.pattern, '');
  }
  
  return sanitized.trim();
}

/**
 * Valida e sanitiza entrada de usuário
 */
export function validateAndSanitizeInput(
  input: unknown,
  schema: z.ZodSchema
): { valid: boolean; data?: unknown; error?: string } {
  try {
    // Primeiro, verificar SQL injection
    if (typeof input === 'string' && detectSQLInjectionAttempt(input)) {
      return {
        valid: false,
        error: 'Entrada contém padrões suspeitos de SQL injection',
      };
    }
    
    // Depois, validar com schema Zod
    const result = schema.safeParse(input);
    
    if (!result.success) {
      return {
        valid: false,
        error: result.error.issues[0]?.message || 'Validação falhou',
      };
    }
    
    return {
      valid: true,
      data: result.data,
    };
  } catch (error) {
    return {
      valid: false,
      error: 'Erro ao validar entrada',
    };
  }
}

/**
 * Sanitiza objeto inteiro recursivamente
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  options: SanitizationOptions = {}
): T {
  const sanitized = { ...obj } as Record<string, unknown>;
  
  for (const key in sanitized) {
    const value = sanitized[key];
    
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value, options);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>, options);
    }
  }
  
  return sanitized as T;
}

/**
 * Escape para uso em queries de forma segura
 */
export function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "''")
    .replace(/"/g, '\\"')
    .replace(/\0/g, '\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}
