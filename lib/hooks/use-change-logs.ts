import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { api } from '@/utils/api-client';
import { CACHE_TIME } from '@/lib/react-query';

export interface ChangeLog {
  id:string;
  action:string;
  timestamp:string;
  user?:{firstName?:string|null; lastName?:string|null; email?:string|null}|null;
}

export function useChangeLogs(entityType:string, entityId:string|undefined|null, options?:Omit<UseQueryOptions<ChangeLog[],Error>, 'queryKey'|'queryFn'|'enabled'>){
  return useQuery<ChangeLog[],Error>({
    queryKey:['changeLogs', entityType, entityId],
    queryFn: async ()=>{
      if(!entityId) return [];
      return await api.get<ChangeLog[]>(`/api/change-logs?entityType=${entityType}&entityId=${entityId}`);
    },
    enabled: !!entityId,
    staleTime: CACHE_TIME.CORTO,
    ...options,
  });
} 