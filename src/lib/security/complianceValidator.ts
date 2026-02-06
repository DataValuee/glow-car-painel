/**
 * Sistema de Validação e Compliance
 */

import { z } from 'zod';

export interface ComplianceRule {
  name: string;
  description: string;
  validate: (data: any) => boolean;
  errorMessage: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validação de Email LGPD/GDPR
 */
export const emailSchema = z.string()
  .email('Email inválido')
  .max(255, 'Email muito longo');

/**
 * Validação de Documentos
 */
export const cpfSchema = z.string()
  .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF deve estar no formato: XXX.XXX.XXX-XX')
  .refine((cpf) => validateCPF(cpf), 'CPF inválido');

export const cnpjSchema = z.string()
  .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ deve estar no formato: XX.XXX.XXX/XXXX-XX')
  .refine((cnpj) => validateCNPJ(cnpj), 'CNPJ inválido');

/**
 * Validação de Telefone
 */
export const phoneSchema = z.string()
  .regex(/^\(\d{2}\)\s?\d{4,5}-\d{4}$/, 'Telefone inválido');

/**
 * Validação de Data
 */
export const dateSchema = z.string()
  .regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Data deve estar no formato: DD/MM/YYYY')
  .refine((date) => validateDate(date), 'Data inválida');

/**
 * Validação de Senha (OWASP)
 */
export const passwordSchema = z.string()
  .min(12, 'Senha deve ter no mínimo 12 caracteres')
  .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
  .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
  .regex(/\d/, 'Senha deve conter pelo menos um número')
  .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Senha deve conter pelo menos um caractere especial');

/**
 * Valida CPF
 */
function validateCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/\D/g, '');
  
  if (cleanCPF.length !== 11 || /^(\d)\1{10}$/.test(cleanCPF)) {
    return false;
  }

  let sum = 0;
  let remainder;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;

  return true;
}

/**
 * Valida CNPJ
 */
function validateCNPJ(cnpj: string): boolean {
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  if (cleanCNPJ.length !== 14 || /^(\d)\1{13}$/.test(cleanCNPJ)) {
    return false;
  }

  let size = cleanCNPJ.length - 2;
  let numbers = cleanCNPJ.substring(0, size);
  let digits = cleanCNPJ.substring(size);
  let sum = 0;
  let pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;

  size = size + 1;
  numbers = cleanCNPJ.substring(0, size);
  sum = 0;
  pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;

  return true;
}

/**
 * Valida data
 */
function validateDate(dateString: string): boolean {
  const [day, month, year] = dateString.split('/').map(Number);
  const date = new Date(year, month - 1, day);
  
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Regras de Compliance LGPD/GDPR
 */
export const complianceRules: ComplianceRule[] = [
  {
    name: 'DATA_RETENTION',
    description: 'Dados devem ser deletados após expiração',
    validate: (data) => data.expirationDate && new Date(data.expirationDate) > new Date(),
    errorMessage: 'Período de retenção expirado',
  },
  {
    name: 'CONSENT',
    description: 'Consentimento deve ser explícito',
    validate: (data) => data.consent === true,
    errorMessage: 'Consentimento não foi fornecido',
  },
  {
    name: 'PURPOSE_LIMITATION',
    description: 'Dados devem ser usados apenas para propósito declarado',
    validate: (data) => data.purpose && data.purpose.length > 0,
    errorMessage: 'Propósito de uso não foi declarado',
  },
  {
    name: 'ANONYMIZATION',
    description: 'Dados sensíveis devem ser anonimizados quando possível',
    validate: (data) => !data.personalData || data.anonymized === true,
    errorMessage: 'Dados pessoais não foram anonimizados',
  },
];

/**
 * Validador de Compliance
 */
export class ComplianceValidator {
  /**
   * Valida dados contra regras de compliance
   */
  static validateCompliance(
    data: any,
    rules: ComplianceRule[] = complianceRules
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const rule of rules) {
      try {
        if (!rule.validate(data)) {
          errors.push(`${rule.name}: ${rule.errorMessage}`);
        }
      } catch (error) {
        warnings.push(`Erro ao validar ${rule.name}: ${error}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Anonimiza dados pessoais
   */
  static anonymizeData(data: any): any {
    const anonymized = { ...data };

    const personalFields = ['email', 'phone', 'cpf', 'cnpj', 'name', 'address'];
    
    for (const field of personalFields) {
      if (field in anonymized && typeof anonymized[field] === 'string') {
        const value = anonymized[field];
        anonymized[field] = this.generateHash(value);
      }
    }

    return anonymized;
  }

  /**
   * Gera hash para anonimização
   */
  private static generateHash(value: string): string {
    // Implementação simples - em produção usar crypto-js
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      const char = value.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `anon_${Math.abs(hash).toString(16)}`;
  }
}
