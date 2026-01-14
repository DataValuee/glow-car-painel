/**
 * Sistema de Auditoria e Logging
 */

export interface AuditLog {
  id?: string;
  timestamp: Date;
  userId?: string;
  action: string;
  resource: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failure';
  errorMessage?: string;
}

export interface AuditConfig {
  enableLocalStorage?: boolean;
  enableRemoteLogging?: boolean;
  maxLocalLogs?: number;
  sensitiveFields?: string[];
}

const DEFAULT_SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'apiKey',
  'creditCard',
  'ssn',
  'email',
];

export class AuditLogger {
  private config: AuditConfig;
  private localLogs: AuditLog[] = [];
  private sensitiveFields: string[];

  constructor(config: AuditConfig = {}) {
    this.config = {
      enableLocalStorage: true,
      enableRemoteLogging: false,
      maxLocalLogs: 1000,
      sensitiveFields: DEFAULT_SENSITIVE_FIELDS,
      ...config,
    };

    this.sensitiveFields = this.config.sensitiveFields || DEFAULT_SENSITIVE_FIELDS;
    this.loadLogsFromStorage();
  }

  /**
   * Registra uma ação no sistema
   */
  async log(auditLog: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    const log: AuditLog = {
      ...auditLog,
      timestamp: new Date(),
      ipAddress: await this.getUserIP(),
      userAgent: navigator.userAgent,
    };

    // Sanitizar dados sensíveis
    log.details = this.maskSensitiveData(log.details);

    // Armazenar localmente
    if (this.config.enableLocalStorage) {
      this.localLogs.push(log);
      this.pruneLocalLogs();
      this.saveLogsToStorage();
    }

    // Enviar para servidor remoto se configurado
    if (this.config.enableRemoteLogging) {
      await this.sendRemoteLog(log);
    }

    console.log('[AUDIT]', log);
  }

  /**
   * Registra uma ação de sucesso
   */
  async logSuccess(
    action: string,
    resource: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      action,
      resource,
      details,
      status: 'success',
    });
  }

  /**
   * Registra uma falha/erro
   */
  async logFailure(
    action: string,
    resource: string,
    errorMessage: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      action,
      resource,
      details,
      status: 'failure',
      errorMessage,
    });
  }

  /**
   * Registra uma tentativa de acesso não autorizado
   */
  async logSecurityEvent(
    eventType: string,
    details: Record<string, any>
  ): Promise<void> {
    await this.log({
      action: 'SECURITY_EVENT',
      resource: eventType,
      details,
      status: 'failure',
    });
  }

  /**
   * Obtém o IP do usuário
   */
  private async getUserIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Mascara dados sensíveis
   */
  private maskSensitiveData(details?: Record<string, any>): Record<string, any> {
    if (!details) return {};

    const masked = { ...details };

    for (const field of this.sensitiveFields) {
      if (field in masked) {
        const value = masked[field];
        if (typeof value === 'string') {
          masked[field] = `***${value.slice(-4)}`;
        } else {
          masked[field] = '***';
        }
      }
    }

    return masked;
  }

  /**
   * Salva logs no localStorage
   */
  private saveLogsToStorage(): void {
    try {
      localStorage.setItem(
        'audit_logs',
        JSON.stringify(this.localLogs)
      );
    } catch (error) {
      console.error('Erro ao salvar logs:', error);
    }
  }

  /**
   * Carrega logs do localStorage
   */
  private loadLogsFromStorage(): void {
    try {
      const stored = localStorage.getItem('audit_logs');
      if (stored) {
        this.localLogs = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
      this.localLogs = [];
    }
  }

  /**
   * Remove logs antigos se exceder limite
   */
  private pruneLocalLogs(): void {
    const maxLogs = this.config.maxLocalLogs || 1000;
    if (this.localLogs.length > maxLogs) {
      this.localLogs = this.localLogs.slice(-maxLogs);
    }
  }

  /**
   * Envia log para servidor remoto
   */
  private async sendRemoteLog(log: AuditLog): Promise<void> {
    try {
      // Este endpoint deve ser implementado no seu backend
      await fetch('/api/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log),
      });
    } catch (error) {
      console.error('Erro ao enviar log remoto:', error);
    }
  }

  /**
   * Retorna logs locais
   */
  getLogs(filter?: { action?: string; status?: string }): AuditLog[] {
    return this.localLogs.filter(log => {
      if (filter?.action && log.action !== filter.action) return false;
      if (filter?.status && log.status !== filter.status) return false;
      return true;
    });
  }

  /**
   * Limpa todos os logs
   */
  clearLogs(): void {
    this.localLogs = [];
    localStorage.removeItem('audit_logs');
  }
}

// Instância global
export const auditLogger = new AuditLogger({
  enableLocalStorage: true,
  enableRemoteLogging: false, // Ativar quando tiver backend
});
