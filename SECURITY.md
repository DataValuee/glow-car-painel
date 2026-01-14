# Sistema de Segurança, Auditoria e Compliance

Este documento descreve o sistema completo de segurança implementado no `glow-report`.

## 📋 Visão Geral

O sistema inclui:

1. **Proteção contra SQL Injection**
2. **Auditoria completa de operações**
3. **Validação e Compliance (LGPD/GDPR)**
4. **Rate Limiting e Timeout**
5. **Wrapper seguro para Supabase**

---

## 1. Proteção contra SQL Injection

### Arquivo: `sqlInjectionProtection.ts`

**Funcionalidades:**
- Detecta padrões perigosos de SQL injection
- Sanitiza strings automaticamente
- Valida entrada com Zod
- Escapa caracteres especiais

### Uso:

```typescript
import {
  detectSQLInjectionAttempt,
  sanitizeString,
  validateAndSanitizeInput,
} from '@/lib/security';

// Detectar tentativa de SQL injection
if (detectSQLInjectionAttempt(userInput)) {
  console.warn('SQL Injection detectada!');
}

// Sanitizar string
const safe = sanitizeString("'; DROP TABLE--", { maxLength: 100 });

// Validar com schema
const schema = z.string().email();
const result = validateAndSanitizeInput(email, schema);
if (result.valid) {
  console.log('Email válido:', result.data);
}
```

**Padrões detectados:**
- UNION, SELECT, INSERT, UPDATE, DELETE, DROP, etc.
- Comentários SQL (`--`, `/* */`)
- Tentativas de XSS
- Comandos perigosos

---

## 2. Auditoria e Logging

### Arquivo: `auditLogger.ts`

**Funcionalidades:**
- Registra todas as operações
- Mascara dados sensíveis
- Armazena localmente e remotamente
- Rastreia IP e User Agent

### Uso:

```typescript
import { auditLogger } from '@/lib/security';

// Log de sucesso
await auditLogger.logSuccess('LOGIN', 'users', {
  userId: 'user-123',
});

// Log de falha
await auditLogger.logFailure('LOGIN', 'users', 'Senha incorreta', {
  attempts: 3,
});

// Evento de segurança
await auditLogger.logSecurityEvent('BRUTE_FORCE_ATTEMPT', {
  ipAddress: '192.168.1.1',
  failedAttempts: 5,
});

// Obter logs
const failureLogs = auditLogger.getLogs({ status: 'failure' });
```

**Dados sensíveis automaticamente mascarados:**
- `password`, `token`, `secret`, `apiKey`
- `creditCard`, `ssn`, `email`
- Campos customizados via config

---

## 3. Validação e Compliance

### Arquivo: `complianceValidator.ts`

**Schemas pré-configurados:**
- `emailSchema` - Validação de email
- `cpfSchema` - Validação de CPF (Brasil)
- `cnpjSchema` - Validação de CNPJ (Brasil)
- `phoneSchema` - Validação de telefone
- `passwordSchema` - Senha forte (OWASP)
- `dateSchema` - Validação de data DD/MM/YYYY

**Regras de Compliance:**
- DATA_RETENTION: Dados devem expirar
- CONSENT: Consentimento explícito
- PURPOSE_LIMITATION: Uso restrito ao propósito
- ANONYMIZATION: Anonimização quando necessário

### Uso:

```typescript
import {
  ComplianceValidator,
  cpfSchema,
  passwordSchema,
} from '@/lib/security';

// Validar CPF
const result = validateAndSanitizeInput('123.456.789-00', cpfSchema);
if (result.valid) {
  console.log('CPF válido');
}

// Validar Compliance
const userData = {
  email: 'user@example.com',
  consent: true,
  purpose: 'Gestão de cliente',
  expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
};

const compliance = ComplianceValidator.validateCompliance(userData);
if (!compliance.valid) {
  console.error('Violações:', compliance.errors);
}

// Anonimizar dados
const anonymized = ComplianceValidator.anonymizeData(userData);
```

---

## 4. Rate Limiting e Timeout

### Arquivo: `rateLimiting.ts`

**Rate Limiters pré-configurados:**

| Limitador | Janela | Limite | Bloqueio |
|-----------|--------|--------|----------|
| API_CALLS | 1 min | 100 | 5 min |
| AUTH | 15 min | 5 | 15 min |
| FILE_UPLOAD | 1 min | 10 | 5 min |
| DATABASE_WRITE | 1 min | 50 | 2 min |

### Uso:

```typescript
import {
  RateLimiter,
  TimeoutManager,
  apiRateLimiter,
  authRateLimiter,
} from '@/lib/security';

// Usar rate limiter existente
if (!authRateLimiter.isAllowed('user-123')) {
  console.warn('Limite excedido');
}

// Obter status
const status = authRateLimiter.getStatus('user-123');
console.log(`Requisições restantes: ${status.remaining}`);

// Criar customizado
const customLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minuto
  maxRequests: 10,
  blockDurationMs: 5 * 60 * 1000, // 5 minutos
});

// Timeout
try {
  const result = await TimeoutManager.withTimeout(
    fetch('/api/data'),
    5000, // 5 segundos
    'Requisição expirou'
  );
} catch (error) {
  console.error('Timeout:', error);
}

// Fetch com timeout
const response = await TimeoutManager.fetchWithTimeout(
  'https://api.example.com/data',
  { timeout: 10000 }
);
```

---

## 5. Supabase Seguro

### Arquivo: `secureSupabase.ts`

**Integração completa de:**
- Sanitização automática
- Rate limiting
- Timeout
- Auditoria
- Validação

### Uso:

```typescript
import { secureSupabase } from '@/lib/security';

// Setar usuário para auditoria
secureSupabase.setUserId('user-123');

// SELECT com proteção
const { data, error } = await secureSupabase.select('clientes', (q) =>
  q.eq('status', 'ativo').limit(10)
);

// INSERT com compliance
const { data: inserted, error } = await secureSupabase.insert(
  'clientes',
  {
    nome: 'João Silva',
    email: 'joao@example.com',
    telefone: '(11) 98765-4321',
  },
  { compliance: true }
);

// UPDATE
const { data: updated } = await secureSupabase.update(
  'clientes',
  { status: 'inativo' },
  { id: 'client-123' }
);

// DELETE
const { data: deleted } = await secureSupabase.delete(
  'clientes',
  { id: 'client-123' }
);

// Opções customizadas
const { data } = await secureSupabase.select('clientes', undefined, {
  timeout: 10000, // 10 segundos
  sanitize: true,
  audit: true,
  compliance: false,
  skipRateLimit: false,
});
```

**Opções:**
```typescript
interface SecureQueryOptions {
  timeout?: number; // Timeout em ms (padrão: 30000)
  sanitize?: boolean; // Sanitizar entrada (padrão: true)
  audit?: boolean; // Registrar em auditoria (padrão: true)
  compliance?: boolean; // Validar compliance (padrão: false)
  skipRateLimit?: boolean; // Ignorar rate limit (padrão: false)
}
```

---

## 6. Exemplo de Hook React

```typescript
import { useEffect, useState } from 'react';
import { secureSupabase, auditLogger } from '@/lib/security';

export function useSecureClientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClientes = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await secureSupabase.select('clientes');

      if (error) {
        setError(error.message);
        await auditLogger.logFailure(
          'FETCH_CLIENTES',
          'clientes',
          error.message
        );
      } else {
        setClientes(data || []);
        await auditLogger.logSuccess('FETCH_CLIENTES', 'clientes', {
          count: data?.length || 0,
        });
      }

      setLoading(false);
    };

    fetchClientes();
  }, []);

  return { clientes, loading, error };
}
```

---

## 7. Configuração de Ambiente

Adicione ao `.env`:

```env
# Auditoria remota (opcional)
VITE_AUDIT_ENDPOINT=https://seu-api.com/audit-logs

# Rate limiting
VITE_RATE_LIMIT_ENABLED=true

# Timeout padrão (ms)
VITE_DEFAULT_TIMEOUT=30000
```

---

## 8. Checklist de Segurança

- [ ] SQL Injection: Usar `secureSupabase` para todas as operações
- [ ] Auditoria: `auditLogger.logSuccess/logFailure` em operações críticas
- [ ] Validação: Usar schemas Zod (`emailSchema`, `cpfSchema`, etc.)
- [ ] Compliance: Validar com `ComplianceValidator.validateCompliance()`
- [ ] Rate Limiting: Verificar `rateLimiter.isAllowed()` antes de operações críticas
- [ ] Timeout: Usar `TimeoutManager.withTimeout()` para promises longas
- [ ] Dados Sensíveis: Usar `ComplianceValidator.anonymizeData()` quando necessário
- [ ] Logs: Revisar regularmente com `auditLogger.getLogs()`

---

## 9. Monitoramento

**Acessar logs armazenados:**

```typescript
// Todos os logs
const allLogs = auditLogger.getLogs();

// Apenas falhas
const failures = auditLogger.getLogs({ status: 'failure' });

// Apenas ação específica
const loginLogs = auditLogger.getLogs({ action: 'LOGIN' });

// Exportar para análise
const logsJSON = JSON.stringify(auditLogger.getLogs());
```

---

## 10. Troubleshooting

**Rate limit muito restritivo?**
```typescript
// Personalizar
const customLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 200, // Aumentar limite
  blockDurationMs: 2 * 60 * 1000,
});
```

**Timeout muito curto?**
```typescript
// Aumentar timeout
const { data } = await secureSupabase.select('clientes', undefined, {
  timeout: 60000, // 60 segundos
});
```

**Validação rejeitando dados válidos?**
```typescript
// Customizar schema
const customSchema = z.string().min(5).max(100);
const result = validateAndSanitizeInput(data, customSchema);
```

---

## 📚 Referências

- [OWASP SQL Injection](https://owasp.org/www-community/attacks/SQL_Injection)
- [LGPD - Lei Geral de Proteção de Dados](https://www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd)
- [GDPR](https://gdpr-info.eu/)
- [Zod Documentation](https://zod.dev/)
- [Rate Limiting Best Practices](https://www.cloudflare.com/learning/ddos/glossary/rate-limiting/)
