/**
 * Sistema de Rate Limiting e Timeout
 */

export interface RateLimitConfig {
  windowMs: number; // Janela de tempo em ms
  maxRequests: number; // Máximo de requisições por janela
  blockDurationMs: number; // Quanto tempo bloquear após exceder limite
  enableIpBasedLimit?: boolean;
}

export interface RateLimitEntry {
  count: number;
  firstRequestTime: number;
  blockedUntil?: number;
}

/**
 * Gerenciador de Rate Limiting
 */
export class RateLimiter {
  private requestMap: Map<string, RateLimitEntry> = new Map();
  private config: RateLimitConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: RateLimitConfig) {
    this.config = config;
    // Limpar entradas antigas periodicamente
    this.startCleanup();
  }

  /**
   * Verifica se a requisição é permitida
   */
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const entry = this.requestMap.get(identifier);

    // Se está bloqueado, verificar se o tempo de bloqueio expirou
    if (entry?.blockedUntil && now < entry.blockedUntil) {
      return false;
    }

    // Se a janela de tempo expirou, resetar
    if (!entry || now - entry.firstRequestTime > this.config.windowMs) {
      this.requestMap.set(identifier, {
        count: 1,
        firstRequestTime: now,
      });
      return true;
    }

    // Incrementar contador
    entry.count++;

    // Verificar se excedeu o limite
    if (entry.count > this.config.maxRequests) {
      entry.blockedUntil = now + this.config.blockDurationMs;
      return false;
    }

    return true;
  }

  /**
   * Obtém informações de rate limit
   */
  getStatus(identifier: string): {
    remaining: number;
    resetTime: number;
    isBlocked: boolean;
  } {
    const now = Date.now();
    const entry = this.requestMap.get(identifier);

    if (!entry || now - entry.firstRequestTime > this.config.windowMs) {
      return {
        remaining: this.config.maxRequests,
        resetTime: now + this.config.windowMs,
        isBlocked: false,
      };
    }

    const isBlocked = !!entry.blockedUntil && now < entry.blockedUntil;

    return {
      remaining: Math.max(0, this.config.maxRequests - entry.count),
      resetTime: entry.firstRequestTime + this.config.windowMs,
      isBlocked,
    };
  }

  /**
   * Reseta o limite para um identificador
   */
  reset(identifier: string): void {
    this.requestMap.delete(identifier);
  }

  /**
   * Limpa todas as entradas
   */
  resetAll(): void {
    this.requestMap.clear();
  }

  /**
   * Inicia limpeza automática de entradas antigas
   */
  private startCleanup(): void {
    // Limpar a cada 5 minutos
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const maxAge = this.config.windowMs + this.config.blockDurationMs;

      for (const [key, entry] of this.requestMap.entries()) {
        if (now - entry.firstRequestTime > maxAge) {
          this.requestMap.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Para o intervalo de limpeza
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

/**
 * Gerenciador de Timeout para requisições
 */
export class TimeoutManager {
  /**
   * Executa uma promisse com timeout
   */
  static withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string = 'Requisição expirou'
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
      ),
    ]);
  }

  /**
   * Cria uma função assíncrona com timeout automático
   */
  static createTimeoutWrapper<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    timeoutMs: number,
    timeoutMessage: string = 'Operação expirou'
  ) {
    return async (...args: T): Promise<R> => {
      return this.withTimeout(fn(...args), timeoutMs, timeoutMessage);
    };
  }

  /**
   * Timeout para fetch com configuração
   */
  static async fetchWithTimeout(
    url: string,
    options: RequestInit & { timeout?: number } = {}
  ): Promise<Response> {
    const timeout = options.timeout || 30000; // 30s padrão
    const { timeout: _, ...fetchOptions } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}

/**
 * Configurações padrão de rate limiting
 */
export const DEFAULT_RATE_LIMITS = {
  API_CALLS: {
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 100,
    blockDurationMs: 5 * 60 * 1000, // 5 minutos
  },
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    maxRequests: 5,
    blockDurationMs: 15 * 60 * 1000, // 15 minutos
  },
  FILE_UPLOAD: {
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 10,
    blockDurationMs: 5 * 60 * 1000, // 5 minutos
  },
  DATABASE_WRITE: {
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 50,
    blockDurationMs: 2 * 60 * 1000, // 2 minutos
  },
};

// Instâncias globais
export const apiRateLimiter = new RateLimiter(DEFAULT_RATE_LIMITS.API_CALLS);
export const authRateLimiter = new RateLimiter(DEFAULT_RATE_LIMITS.AUTH);
export const uploadRateLimiter = new RateLimiter(DEFAULT_RATE_LIMITS.FILE_UPLOAD);
export const dbRateLimiter = new RateLimiter(DEFAULT_RATE_LIMITS.DATABASE_WRITE);
