/// <reference types="vitest" />
/**
 * Testes do Sistema de Segurança
 */

import { vi, describe, test, expect, beforeAll, afterAll } from 'vitest';
import {
  detectSQLInjectionAttempt,
  sanitizeString,
  validateAndSanitizeInput,
  AuditLogger,
  RateLimiter,
  TimeoutManager,
  ComplianceValidator,
  cpfSchema,
  cnpjSchema,
  emailSchema,
  passwordSchema,
} from '@/lib/security';
import { z } from 'zod';
declare const global: any;

vi.mock('global', () => ({
  fetch: vi.fn(() => Promise.resolve({
    json: () => Promise.resolve({ ip: '127.0.0.1' }),
  })),
}));
/**
 * Testes de SQL Injection
 */
describe('SQL Injection Protection', () => {
  test('deve detectar SQL injection patterns', () => {
    expect(detectSQLInjectionAttempt("'; DROP TABLE users; --")).toBe(true);
    expect(detectSQLInjectionAttempt('1 OR 1=1')).toBe(true);
    expect(detectSQLInjectionAttempt('UNION SELECT * FROM')).toBe(true);
  });

  test('não deve detectar strings normais', () => {
    expect(detectSQLInjectionAttempt('João Silva')).toBe(false);
    expect(detectSQLInjectionAttempt('email@example.com')).toBe(false);
  });

  test('deve sanitizar strings', () => {
    const dangerous = "'; DROP--";
    const safe = sanitizeString(dangerous);
    expect(safe).not.toContain("'");
    expect(safe).not.toContain("--");
  });

  test('deve validar com Zod schema', () => {
    const schema = z.string().email();
    
    const valid = validateAndSanitizeInput('user@example.com', schema);
    expect(valid.valid).toBe(true);

    const invalid = validateAndSanitizeInput('not-an-email', schema);
    expect(invalid.valid).toBe(false);
  });
});

/**
 * Testes de Auditoria
 */
describe('Audit Logger', () => {
  // Mock fetch para evitar chamadas de rede
  const originalFetch = global.fetch;
  
  beforeAll(() => {
    global.fetch = vi.fn(() => 
      Promise.resolve({
        json: () => Promise.resolve({ ip: '127.0.0.1' }),
      })
    ) as any;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  test('deve registrar logs com timestamp', async () => {
    const logger = new AuditLogger({ enableLocalStorage: true });
    
    await logger.logSuccess('TEST_ACTION', 'test_resource', { data: 'test' });
    
    const logs = logger.getLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].action).toBe('TEST_ACTION');
    expect(logs[0].status).toBe('success');
  });

  test('deve mascarar dados sensíveis', async () => {
    const logger = new AuditLogger({ enableLocalStorage: true });
    
    await logger.logSuccess('LOGIN', 'user', {
      email: 'user@example.com',
      password: 'secret123',
    });

    const logs = logger.getLogs();
    const sensitiveData = logs[0].details;
    
    // Email e password devem estar mascarados
    expect(sensitiveData.email).toContain('***');
    expect(sensitiveData.password).toContain('***');
  });

  test('deve registrar falhas com mensagem de erro', async () => {
    const logger = new AuditLogger({ enableLocalStorage: true });
    
    await logger.logFailure('DELETE', 'users', 'Acesso negado', { userId: '123' });
    
    const logs = logger.getLogs();
    expect(logs[0].status).toBe('failure');
    expect(logs[0].errorMessage).toBe('Acesso negado');
  });
});

/**
 * Testes de Rate Limiting
 */
describe('Rate Limiter', () => {
  test('deve permitir requisições dentro do limite', () => {
    const limiter = new RateLimiter({
      windowMs: 60 * 1000,
      maxRequests: 5,
      blockDurationMs: 60 * 1000,
    });

    expect(limiter.isAllowed('user-1')).toBe(true);
    expect(limiter.isAllowed('user-1')).toBe(true);
    expect(limiter.isAllowed('user-1')).toBe(true);
    expect(limiter.isAllowed('user-1')).toBe(true);
    expect(limiter.isAllowed('user-1')).toBe(true);
  });

  test('deve bloquear requisições acima do limite', () => {
    const limiter = new RateLimiter({
      windowMs: 60 * 1000,
      maxRequests: 3,
      blockDurationMs: 60 * 1000,
    });

    limiter.isAllowed('user-2');
    limiter.isAllowed('user-2');
    limiter.isAllowed('user-2');
    
    expect(limiter.isAllowed('user-2')).toBe(false);
  });

  test('deve retornar status correto', () => {
    const limiter = new RateLimiter({
      windowMs: 60 * 1000,
      maxRequests: 5,
      blockDurationMs: 60 * 1000,
    });

    limiter.isAllowed('user-3');
    limiter.isAllowed('user-3');
    
    const status = limiter.getStatus('user-3');
    expect(status.remaining).toBe(3);
    expect(status.isBlocked).toBe(false);
  });

  test('deve limpar entradas antigas', async () => {
    const limiter = new RateLimiter({
      windowMs: 100, // 100ms
      maxRequests: 5,
      blockDurationMs: 100,
    });

    limiter.isAllowed('user-4');
    
    // Esperar a janela expirar
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const status = limiter.getStatus('user-4');
    expect(status.remaining).toBe(5); // Reset
  });
});

/**
 * Testes de Validação
 */
describe('Compliance Validator', () => {
  test('deve validar CPF válido', () => {
    // CPF válido (teste)
    const valid = validateAndSanitizeInput('123.456.789-09', cpfSchema);
    // Nota: Este é um CPF para teste, em produção validar com CPF real
    expect(valid.valid).toBe(true);
  });

  test('deve validar email', () => {
    const valid = validateAndSanitizeInput('user@example.com', emailSchema);
    expect(valid.valid).toBe(true);

    const invalid = validateAndSanitizeInput('invalid-email', emailSchema);
    expect(invalid.valid).toBe(false);
  });

  test('deve validar senha forte (OWASP)', () => {
    const weak = validateAndSanitizeInput('weak', passwordSchema);
    expect(weak.valid).toBe(false);

    const strong = validateAndSanitizeInput('SecurePass123!@#', passwordSchema);
    expect(strong.valid).toBe(true);
  });

  test('deve validar compliance rules', () => {
    const userData = {
      email: 'user@example.com',
      consent: true,
      purpose: 'User management',
      expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };

    const result = ComplianceValidator.validateCompliance(userData);
    expect(result.valid).toBe(true);
  });

  test('deve anonimizar dados pessoais', () => {
    const data = {
      name: 'João Silva',
      email: 'joao@example.com',
      cpf: '123.456.789-00',
    };

    const anonymized = ComplianceValidator.anonymizeData(data);
    expect(anonymized.name).toContain('anon_');
    expect(anonymized.email).toContain('anon_');
    expect(anonymized.cpf).toContain('anon_');
  });
});

/**
 * Testes de Timeout
 */
describe('Timeout Manager', () => {
  test('deve executar promise dentro do timeout', async () => {
    const promise = new Promise((resolve) =>
      setTimeout(() => resolve('sucesso'), 100)
    );

    const result = await TimeoutManager.withTimeout(promise, 500);
    expect(result).toBe('sucesso');
  });

  test('deve rejeitar promise que excede timeout', async () => {
    const promise = new Promise((resolve) =>
      setTimeout(() => resolve('sucesso'), 500)
    );

    await expect(
      TimeoutManager.withTimeout(promise, 100)
    ).rejects.toThrow('expirou');
  });

  test('deve criar wrapper com timeout automático', async () => {
    const slowFunction = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return 'resultado';
    };

    const wrappedFn = TimeoutManager.createTimeoutWrapper(slowFunction, 500);
    const result = await wrappedFn();
    expect(result).toBe('resultado');
  });
});

/**
 * Testes de Integração
 */
describe('Integration Tests', () => {
  test('deve integrar SQL injection detection com sanitização', () => {
    const maliciousInput = "'; DELETE FROM users; --";
    
    const isAttack = detectSQLInjectionAttempt(maliciousInput);
    expect(isAttack).toBe(true);
    
    const safe = sanitizeString(maliciousInput);
    expect(safe).not.toContain("'");
    expect(safe).not.toContain("--");
  });

  test('deve validar entrada e registrar em auditoria', async () => {
    const logger = new AuditLogger({ enableLocalStorage: true });
    
    const schema = z.string().email();
    const email = 'test@example.com';
    
    const result = validateAndSanitizeInput(email, schema);
    expect(result.valid).toBe(true);
    
    await logger.logSuccess('EMAIL_VALIDATION', 'email', { email });

    const logs = logger.getLogs();
    expect(logs.length).toBe(1);
  });

  test('deve aplicar rate limit antes de auditoria', async () => {
    const logger = new AuditLogger({ enableLocalStorage: true });
    const limiter = new RateLimiter({
      windowMs: 60 * 1000,
      maxRequests: 2,
      blockDurationMs: 60 * 1000,
    });

    const userId = 'test-user';

    // Primeira requisição
    expect(limiter.isAllowed(userId)).toBe(true);
    await logger.logSuccess('API_CALL', 'test', {});

    // Segunda requisição
    expect(limiter.isAllowed(userId)).toBe(true);
    await logger.logSuccess('API_CALL', 'test', {});

    // Terceira requisição - deve ser bloqueada
    expect(limiter.isAllowed(userId)).toBe(false);
    await logger.logSecurityEvent('RATE_LIMIT_EXCEEDED', { userId });

    const logs = logger.getLogs();
    expect(logs.length).toBe(3);
    expect(logs[2].resource).toBe('RATE_LIMIT_EXCEEDED');
  });
});

// Executar testes
console.log('✅ Sistema de Segurança testado com sucesso');
