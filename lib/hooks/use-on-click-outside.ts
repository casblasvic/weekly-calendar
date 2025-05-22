import { useEffect, RefObject } from 'react';

type Event = MouseEvent | TouchEvent;

function useOnClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T> | RefObject<T>[],
  handler: (event: Event) => void,
  active: boolean = true // Permite activar/desactivar el hook
): void {
  useEffect(() => {
    if (!active) {
      return;
    }

    const listener = (event: Event) => {
      const refsArray = Array.isArray(ref) ? ref : [ref];
      
      // Comprobar si el clic fue dentro de alguno de los elementos referenciados
      const clickedInside = refsArray.some(singleRef => 
        singleRef.current && singleRef.current.contains(event.target as Node)
      );

      if (clickedInside) {
        return;
      }

      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler, active]); // Volver a vincular si ref, handler o active cambian
}

export default useOnClickOutside; 