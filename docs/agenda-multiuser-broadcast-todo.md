# TODO – WebSocket Broadcast para Agenda multi-usuario

Actualmente el caché de React-Query se persiste en IndexedDB con `staleTime` de 15 min. 
Esto elimina refetch por tiempo en la primera carga, pero **necesitamos coherencia instantánea** entre sesiones/pestañas y entre usuarios.

## Próximo paso (pendiente)
1.  Emitir evento Socket.io desde el backend cuando se cree/actualice/elimine una cita.
    ```ts
    io.to(systemId).emit('appointments:updated', { weekKey, clinicId })
    ```
2.  En el frontend (por ejemplo en `useAppointmentsRealtime.ts`)
    ```ts
    socket.on('appointments:updated', ({ weekKey, clinicId }) => {
      queryClient.invalidateQueries({ queryKey: ['appointments','week', weekKey, clinicId] })
    })
    ```
3.  Eliminar o poner `staleTime: Infinity` cuando el broadcast esté operativo.

⚠️  **Importante**: marcar las queries invalidadas con `refetchType: 'sync'` si se requiere que se refresquen incluso cuando la pestaña está en segundo plano. 