/**
 * Wrapper seguro para operações do Supabase
 * Integra auditoria, proteção contra SQL injection, timeout e rate limiting
 */

import { supabase } from '@/integrations/supabase/client';
import { auditLogger } from './auditLogger';
import {
  apiRateLimiter,
  dbRateLimiter,
  TimeoutManager,
} from './rateLimiting';
import {
  sanitizeString,
  sanitizeObject,
  detectSQLInjectionAttempt,
} from './sqlInjectionProtection';
import { ComplianceValidator } from './complianceValidator';
import type { Database } from '@/integrations/supabase/types';

type TableName = keyof Database['public']['Tables'];

export interface SecureQueryOptions {
  timeout?: number; // ms
  sanitize?: boolean;
  audit?: boolean;
  compliance?: boolean;
  skipRateLimit?: boolean;
}

const DEFAULT_OPTIONS: SecureQueryOptions = {
  timeout: 30000, // 30 segundos
  sanitize: true,
  audit: true,
  compliance: false,
  skipRateLimit: false,
};

/**
 * Gerenciador seguro de operações do Supabase
 */
export class SecureSupabaseClient {
  private options: SecureQueryOptions;
  private userId?: string;

  constructor(options: Partial<SecureQueryOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Define o ID do usuário para auditoria
   */
  setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * SELECT com proteção
   */
  async select<T = unknown>(
    table: TableName,
    query?: (q: ReturnType<typeof supabase.from>) => unknown,
    options?: SecureQueryOptions
  ): Promise<{ data: T[] | null; error?: Error }> {
    const opts = { ...this.options, ...options };

    try {
      // Rate limit
      if (!opts.skipRateLimit && !this.checkRateLimit('db_read', table)) {
        throw new Error('Limite de requisições excedido. Tente novamente mais tarde.');
      }

      // Sanitização
      const sanitizedTable = opts.sanitize ? this.sanitizeTableName(table) : table;

      // Executar com timeout
      const result = await TimeoutManager.withTimeout(
        this.executeSelect<T>(sanitizedTable as TableName, query),
        opts.timeout || 30000,
        'Consulta expirou'
      );

      // Auditoria
      if (opts.audit) {
        await auditLogger.logSuccess('SELECT', table, {
          rowsReturned: result.data?.length || 0,
        });
      }
      return { data: result.data as T[], error: result.error };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (opts.audit) {
        await auditLogger.logFailure('SELECT', table, errorMessage);
      }

      return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }

  /**
   * INSERT com proteção
   */
  async insert<T = unknown>(
    table: TableName,
    data: Record<string, unknown> | Record<string, unknown>[],
    options?: SecureQueryOptions
  ): Promise<{ data: T[] | null; error?: Error }> {
    const opts = { ...this.options, ...options };

    try {
      // Rate limit
      if (!opts.skipRateLimit && !this.checkRateLimit('db_write', table)) {
        throw new Error('Limite de requisições excedido. Tente novamente mais tarde.');
      }

      // Sanitização
      const sanitizedTable = opts.sanitize ? this.sanitizeTableName(table) : table;
      let sanitizedData = data;
      if (opts.sanitize) {
        sanitizedData = Array.isArray(data)
          ? data.map(d => this.sanitizeData(d))
          : this.sanitizeData(data);
      }

      // Compliance
      if (opts.compliance) {
        const compliance = ComplianceValidator.validateCompliance(sanitizedData);
        if (!compliance.valid) {
          throw new Error(`Validação de compliance falhou: ${compliance.errors.join(', ')}`);
        }
      }

      // Executar com timeout
      const result = await TimeoutManager.withTimeout(
        this.executeInsert<T>(sanitizedTable as TableName, sanitizedData),
        opts.timeout || 30000,
        'Inserção expirou'
      );

      // Auditoria
      if (opts.audit) {
        await auditLogger.logSuccess('INSERT', table, {
          rowsInserted: Array.isArray(result.data) ? result.data.length : 1,
        });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (opts.audit) {
        await auditLogger.logFailure('INSERT', table, errorMessage);
      }

      return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }

  /**
   * UPDATE com proteção
   */
  async update<T = unknown>(
    table: TableName,
    data: Record<string, unknown>,
    where: Record<string, unknown>,
    options?: SecureQueryOptions
  ): Promise<{ data: T[] | null; error?: Error }> {
    const opts = { ...this.options, ...options };

    try {
      // Rate limit
      if (!opts.skipRateLimit && !this.checkRateLimit('db_write', table)) {
        throw new Error('Limite de requisições excedido. Tente novamente mais tarde.');
      }

      // Sanitização
      const sanitizedTable = opts.sanitize ? this.sanitizeTableName(table) : table;
      const sanitizedData = opts.sanitize ? this.sanitizeData(data) : data;
      const sanitizedWhere = opts.sanitize ? this.sanitizeData(where) : where;

      // Executar com timeout
      const result = await TimeoutManager.withTimeout(
        this.executeUpdate<T>(sanitizedTable as TableName, sanitizedData, sanitizedWhere),
        opts.timeout || 30000,
        'Atualização expirou'
      );

      // Auditoria
      if (opts.audit) {
        await auditLogger.logSuccess('UPDATE', table, {
          rowsUpdated: result.data?.length || 0,
          whereClause: where,
        });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (opts.audit) {
        await auditLogger.logFailure('UPDATE', table, errorMessage, { where });
      }

      return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }

  /**
   * DELETE com proteção
   */
  async delete(
    table: TableName,
    where: Record<string, unknown>,
    options?: SecureQueryOptions
  ): Promise<{ data: unknown[] | null; error?: Error }> {
    const opts = { ...this.options, ...options };

    try {
      // Rate limit
      if (!opts.skipRateLimit && !this.checkRateLimit('db_write', table)) {
        throw new Error('Limite de requisições excedido. Tente novamente mais tarde.');
      }

      // Sanitização
      const sanitizedTable = opts.sanitize ? this.sanitizeTableName(table) : table;
      const sanitizedWhere = opts.sanitize ? this.sanitizeData(where) : where;

      // Executar com timeout
      const result = await TimeoutManager.withTimeout(
        this.executeDelete(sanitizedTable as TableName, sanitizedWhere),
        opts.timeout || 30000,
        'Exclusão expirou'
      );

      // Auditoria
      if (opts.audit) {
        await auditLogger.logSuccess('DELETE', table, {
          whereClause: where,
        });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (opts.audit) {
        await auditLogger.logFailure('DELETE', table, errorMessage, { where });
      }

      return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }

  /**
   * Executa SELECT
   */
  private async executeSelect<T>(
    table: TableName,
    query?: (q: ReturnType<typeof supabase.from>) => unknown
  ): Promise<{ data: T[] | null; error?: Error }> {
    let q = supabase.from(table).select('*');

    if (query) {
      q = query(supabase.from(table)) as typeof q;
    }

    const { data, error } = await q;

    if (error) {
      throw error;
    }

    return { data: data as T[] };
  }

  /**
   * Executa INSERT
   */
  private async executeInsert<T>(
    table: TableName,
    data: Record<string, unknown> | Record<string, unknown>[]
  ): Promise<{ data: T[] | null; error?: Error }> {
    const insertData = Array.isArray(data) ? data : [data];
    
    const { data: result, error } = await supabase
      .from(table)
      .insert(insertData as never[])
      .select();

    if (error) {
      throw error;
    }

    return { data: result as T[] };
  }

  /**
   * Executa UPDATE
   */
  private async executeUpdate<T>(
    table: TableName,
    data: Record<string, unknown>,
    where: Record<string, unknown>
  ): Promise<{ data: T[] | null; error?: Error }> {
    const entries = Object.entries(where);
    if (entries.length === 0) {
      throw new Error('WHERE clause is required for UPDATE');
    }

    // Use raw query approach to avoid deep type instantiation
    const { data: result, error } = await supabase
      .from(table)
      .update(data as never)
      .match(where as never)
      .select();

    if (error) {
      throw error;
    }

    return { data: result as T[] };
  }

  /**
   * Executa DELETE
   */
  private async executeDelete(
    table: TableName,
    where: Record<string, unknown>
  ): Promise<{ data: unknown[] | null; error?: Error }> {
    // Use match to avoid deep type instantiation
    const { data, error } = await supabase
      .from(table)
      .delete()
      .match(where as never)
      .select();

    if (error) {
      throw error;
    }

    return { data };
  }

  /**
   * Sanitiza nome de tabela
   */
  private sanitizeTableName(table: string): string {
    // Apenas alfanuméricos e underscore
    return table.replace(/[^\w]/g, '');
  }

  /**
   * Sanitiza dados
   */
  private sanitizeData<T extends Record<string, unknown>>(data: T): T {
    if (typeof data === 'string') {
      // Verificar SQL injection
      if (detectSQLInjectionAttempt(data)) {
        throw new Error('Entrada contém padrões suspeitos');
      }
      return sanitizeString(data) as unknown as T;
    }

    if (typeof data === 'object' && data !== null) {
      return sanitizeObject(data);
    }

    return data;
  }

  /**
   * Verifica rate limit
   */
  private checkRateLimit(operation: string, resource: string): boolean {
    const identifier = `${operation}:${resource}:${this.userId || 'anonymous'}`;
    
    if (operation.includes('write')) {
      return dbRateLimiter.isAllowed(identifier);
    }

    return apiRateLimiter.isAllowed(identifier);
  }
}

// Instância padrão
export const secureSupabase = new SecureSupabaseClient();
