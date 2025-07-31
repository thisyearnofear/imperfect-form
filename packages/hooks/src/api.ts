import { ZodSchema } from 'zod';
import { useQuery, type QueryKey, type UseQueryOptions } from '@tanstack/react-query';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function fetchJson<T>(url: string, schema: ZodSchema<T>, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new ApiError(`Request failed: ${res.status}`, res.status);
  }
  let data: unknown;
  try {
    data = await res.json();
  } catch (err) {
    throw new ApiError('Invalid JSON response', res.status);
  }
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new ApiError('Response validation failed', res.status);
  }
  return parsed.data;
}

export function useApiQuery<T>(
  key: QueryKey,
  url: string,
  schema: ZodSchema<T>,
  options?: UseQueryOptions<T>
) {
  return useQuery<T>({
    queryKey: key,
    queryFn: () => fetchJson(url, schema),
    ...options,
  });
}