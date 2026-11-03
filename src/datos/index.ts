// Elige la fuente de datos: Supabase si hay llaves en .env, si no el modo demo.
import { RepositorioDemo } from './demo';
import type { Repositorio } from './repositorio';
import { RepositorioSupabase } from './supabase';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const llave = process.env.EXPO_PUBLIC_SUPABASE_KEY;

export const repo: Repositorio = url && llave ? new RepositorioSupabase(url, llave) : new RepositorioDemo();
export type { Repositorio } from './repositorio';
export * from './tipos';
