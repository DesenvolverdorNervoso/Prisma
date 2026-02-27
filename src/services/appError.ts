export class AppError extends Error {
  code: string;
  details?: any;

  constructor(message: string, code: string = 'APP_ERROR', details?: any) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }
}

export const toAppError = (err: any): AppError => {
  if (err instanceof AppError) return err;

  // Supabase / PostgREST error mapping
  const code = err?.code || 'UNKNOWN_ERROR';
  let message = err?.message;

  // Ensure message is a string and not empty
  if (typeof message !== 'string' || message.trim() === '') {
    const details = err?.details;
    const hint = err?.hint;
    
    if (typeof details === 'string' && details.trim() !== '') {
      message = details;
    } else if (typeof hint === 'string' && hint.trim() !== '') {
      message = hint;
    } else {
      const stringified = typeof err === 'object' ? JSON.stringify(err) : String(err);
      // Avoid showing useless stringified empty objects
      if (!stringified || stringified === '{}' || stringified === '{"message":""}' || stringified === 'null') {
        message = 'Erro inesperado ao acessar o banco de dados (Supabase). Verifique sua conexão e permissões.';
      } else {
        message = stringified;
      }
    }
  }
  
  // Final safety check: if message is still somehow not a string, stringify it
  if (typeof message !== 'string') {
    message = JSON.stringify(message) || 'Erro desconhecido.';
  }
  
  // RLS / Permission
  if (code === '42501' || message.includes('row-level security') || message.includes('permission denied')) {
    return new AppError('Permissão negada: tenant_id não definido ou políticas RLS não aplicadas.', 'PERMISSION_DENIED', err);
  }

  // Constraint violations
  if (code === '23505') {
    return new AppError('Este registro já existe (duplicidade).', 'DUPLICATE_ENTRY', err);
  }
  
  if (code === '23503') {
    return new AppError('Não é possível realizar esta ação pois existem registros vinculados.', 'FOREIGN_KEY_VIOLATION', err);
  }

  if (code === '23502') {
    return new AppError('Campo obrigatório não preenchido.', 'NOT_NULL_VIOLATION', err);
  }

  // Schema cache / Invalid enum
  if (code === 'PGRST103' || message.includes('schema cache')) {
    return new AppError('Erro de sincronização com o banco de dados. Tente novamente.', 'SCHEMA_CACHE_ERROR', err);
  }

  return new AppError(message, code, err);
};
