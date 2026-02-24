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
  const message = err.message || 'Ocorreu um erro inesperado.';
  const code = err.code || 'UNKNOWN_ERROR';
  
  // RLS / Permission
  if (code === '42501' || message.includes('row-level security')) {
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
