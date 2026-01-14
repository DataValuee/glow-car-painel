/**
 * Exemplo de como usar o sistema de segurança
 */

import {
  // SQL Injection Protection
  sanitizeString,
  validateAndSanitizeInput,
  detectSQLInjectionAttempt,

  // Audit
  auditLogger,

  // Compliance
  ComplianceValidator,
  emailSchema,
  cpfSchema,
  passwordSchema,

  // Rate Limiting
  authRateLimiter,
  TimeoutManager,

  // Secure Supabase
  secureSupabase,
} from '@/lib/security';

/**
 * EXEMPLO 1: Proteção contra SQL Injection
 */
export async function exemploSQLInjection() {
  // Entrada perigosa
  const userInput = "'; DROP TABLE users; --";

  // Detectar tentativa
  if (detectSQLInjectionAttempt(userInput)) {
    console.warn('Tentativa de SQL injection detectada!');
    await auditLogger.logSecurityEvent('SQL_INJECTION_ATTEMPT', {
      input: userInput,
    });
    return;
  }

  // Sanitizar entrada
  const safe = sanitizeString(userInput);
  console.log('Entrada sanitizada:', safe);
}

/**
 * EXEMPLO 2: Validação com Zod + Detecção de SQL Injection
 */
export async function exemploValidacao() {
  const userData = {
    email: 'user@example.com',
    password: 'SecurePass123!@#',
    cpf: '123.456.789-00',
  };

  // Validar email
  const emailValidation = validateAndSanitizeInput(
    userData.email,
    emailSchema
  );

  if (!emailValidation.valid) {
    console.error('Email inválido:', emailValidation.error);
    return;
  }

  console.log('Email validado:', emailValidation.data);

  // Validar CPF
  const cpfValidation = validateAndSanitizeInput(
    userData.cpf,
    cpfSchema
  );

  if (!cpfValidation.valid) {
    console.error('CPF inválido:', cpfValidation.error);
    return;
  }

  // Validar Senha (OWASP)
  const passwordValidation = validateAndSanitizeInput(
    userData.password,
    passwordSchema
  );

  if (!passwordValidation.valid) {
    console.error('Senha fraca:', passwordValidation.error);
    return;
  }

  console.log('Todos os dados validados com sucesso!');
}

/**
 * EXEMPLO 3: Auditoria de Operações
 */
export async function exemploAuditoria() {
  // Log de sucesso
  await auditLogger.logSuccess('LOGIN', 'user', {
    userId: 'user-123',
    timestamp: new Date().toISOString(),
  });

  // Log de falha
  await auditLogger.logFailure(
    'LOGIN',
    'user',
    'Senha incorreta',
    { userId: 'user-123' }
  );

  // Log de evento de segurança
  await auditLogger.logSecurityEvent('BRUTE_FORCE_ATTEMPT', {
    ipAddress: '192.168.1.1',
    failedAttempts: 5,
  });

  // Obter logs
  const logs = auditLogger.getLogs({ status: 'failure' });
  console.log('Logs de falha:', logs);
}

/**
 * EXEMPLO 4: Compliance LGPD/GDPR
 */
export async function exemploCompliance() {
  const userData = {
    name: 'João Silva',
    email: 'joao@example.com',
    cpf: '123.456.789-00',
    consent: true,
    purpose: 'Gestão de cliente',
    expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
  };

  // Validar compliance
  const result = ComplianceValidator.validateCompliance(userData);

  if (!result.valid) {
    console.error('Violações de compliance:', result.errors);
    return;
  }

  console.log('Dados estão em conformidade');

  // Anonimizar dados
  const anonymized = ComplianceValidator.anonymizeData(userData);
  console.log('Dados anonimizados:', anonymized);
}

/**
 * EXEMPLO 5: Rate Limiting e Timeout
 */
export async function exemploRateLimitingTimeout() {
  const userId = 'user-123';

  // Verificar rate limit para login
  if (!authRateLimiter.isAllowed(`login:${userId}`)) {
    console.warn('Limite de tentativas de login excedido');
    await auditLogger.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
      resource: 'login',
      userId,
    });
    return;
  }

  // Executar com timeout
  try {
    const result = await TimeoutManager.withTimeout(
      fetch('https://api.example.com/data'),
      5000, // 5 segundos
      'Requisição expirou após 5s'
    );

    console.log('Requisição bem-sucedida:', result);
  } catch (error) {
    console.error('Erro:', error);
  }
}

/**
 * EXEMPLO 6: Supabase Seguro
 */
export async function exemploSupabaseSeguro() {
  // Setando ID do usuário para auditoria
  secureSupabase.setUserId('user-123');

  // SELECT com proteção automática (usando tabela 'entregas' que existe no schema)
  const { data, error } = await secureSupabase.select('entregas', (q) =>
    q.select('*').eq('status', 'Concluída')
  );

  if (error) {
    console.error('Erro na consulta:', error);
    return;
  }

  console.log('Entregas:', data);

  // INSERT com proteção automática
  const { data: inserted, error: insertError } = await secureSupabase.insert(
    'entregas',
    {
      cliente_nome: 'Novo Cliente',
      placa_veiculo: 'ABC-1234',
      vendedor_numero: '11999999999',
      pdf_url: 'https://example.com/pdf.pdf',
      quantidade_fotos: 1,
      status: 'Concluída',
    },
    { compliance: true }
  );

  if (insertError) {
    console.error('Erro ao inserir:', insertError);
    return;
  }

  console.log('Entrega inserida:', inserted);

  // UPDATE com proteção automática
  const { data: updated, error: updateError } = await secureSupabase.update(
    'entregas',
    { status: 'Cancelada' },
    { id: 'entrega-123' }
  );

  if (updateError) {
    console.error('Erro ao atualizar:', updateError);
    return;
  }

  console.log('Entrega atualizada:', updated);

  // DELETE com proteção automática
  const { data: deleted, error: deleteError } = await secureSupabase.delete(
    'entregas',
    { id: 'entrega-123' }
  );

  if (deleteError) {
    console.error('Erro ao deletar:', deleteError);
    return;
  }

  console.log('Entrega deletada');
}

/**
 * EXEMPLO 7: Custom Rate Limit
 */
export async function exemploCustomRateLimit() {
  // Verificar se pode fazer upload usando o rate limiter existente
  if (!authRateLimiter.isAllowed('upload:user-123')) {
    console.warn('Limite de uploads excedido');
    return;
  }

  // Obter status
  const status = authRateLimiter.getStatus('upload:user-123');
  console.log(`Uploads restantes: ${status.remaining}`);
}

/**
 * EXEMPLO 8: Integrando tudo em um hook React
 */
export function exemploHookReact() {
  // Pseudo-código
  /*
  import { useEffect, useState } from 'react';
  import { secureSupabase, auditLogger, authRateLimiter } from '@/lib/security';

  export function useSecureData() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
      const fetchData = async () => {
        setLoading(true);

        // Verificar rate limit
        if (!authRateLimiter.isAllowed('fetch-data')) {
          setError('Muitas requisições. Tente novamente em alguns momentos.');
          return;
        }

        // Buscar dados com proteção
        const { data, error } = await secureSupabase.select('clientes');

        if (error) {
          setError(error.message);
          await auditLogger.logFailure('FETCH_CLIENTES', 'clientes', error.message);
        } else {
          setData(data);
          await auditLogger.logSuccess('FETCH_CLIENTES', 'clientes', {
            count: data?.length,
          });
        }

        setLoading(false);
      };

      fetchData();
    }, []);

    return { data, loading, error };
  }
  */
}

console.log('Exemplos de segurança carregados. Veja os comentários para uso.');
