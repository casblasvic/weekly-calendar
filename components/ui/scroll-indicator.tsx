import { useState, useEffect, useCallback, RefObject } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ScrollIndicatorProps {
  containerRef: RefObject<HTMLElement>;
  className?: string;
  position?: 'left' | 'center' | 'right';
  offset?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
  topClassName?: string;
  bottomClassName?: string;
  scrollAmount?: number;
  pulseAnimation?: boolean;
  iconSize?: number;
  showAlways?: boolean;
}

export function ScrollIndicator({
  containerRef,
  className,
  position = 'center',
  offset = { top: 20, bottom: 20 },
  topClassName,
  bottomClassName,
  scrollAmount = 200,
  pulseAnimation = true,
  iconSize = 20,
  showAlways = false,
}: ScrollIndicatorProps) {
  const [showUpIndicator, setShowUpIndicator] = useState(false);
  const [showDownIndicator, setShowDownIndicator] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(false);

  // Calcular posicionamiento horizontal basado en la prop position
  const getHorizontalPosition = useCallback(() => {
    switch (position) {
      case 'left': return { left: offset.left || 20, right: 'auto' };
      case 'right': return { left: 'auto', right: offset.right || 20 };
      case 'center': 
      default: 
        return { 
          left: '50%', 
          transform: 'translateX(-50%)'
        };
    }
  }, [position, offset.left, offset.right]);

  // Verificar si se debe mostrar los indicadores
  const checkScrollPosition = useCallback(() => {
    if (!containerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    
    // Mostrar indicador superior si se ha scrolleado hacia abajo
    setShowUpIndicator(scrollTop > 20);
    
    // Mostrar indicador inferior si hay más contenido para scrollear
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 20;
    setIsAtBottom(isNearBottom);
    setShowDownIndicator(scrollHeight - scrollTop - clientHeight > 20);
  }, [containerRef]);

  // Ejecutar scroll
  const handleScrollUp = useCallback(() => {
    if (!containerRef.current) return;
    containerRef.current.scrollBy({
      top: -scrollAmount,
      behavior: 'smooth'
    });
  }, [containerRef, scrollAmount]);

  const handleScrollDown = useCallback(() => {
    if (!containerRef.current) return;
    containerRef.current.scrollBy({
      top: scrollAmount,
      behavior: 'smooth'
    });
  }, [containerRef, scrollAmount]);

  // Configurar verificación inicial y event listeners
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Verificar posición inicial
    checkScrollPosition();
    
    // Agregar event listener para scroll
    const container = containerRef.current;
    container.addEventListener('scroll', checkScrollPosition);
    
    // Agregar comprobación en caso de que cambie el tamaño del contenido
    const resizeObserver = new ResizeObserver(() => {
      checkScrollPosition();
    });
    
    resizeObserver.observe(container);
    
    // Limpieza
    return () => {
      container.removeEventListener('scroll', checkScrollPosition);
      resizeObserver.disconnect();
    };
  }, [containerRef, checkScrollPosition]);

  const horizontalPosition = getHorizontalPosition();
  
  return (
    <>
      {/* Indicador de scroll hacia arriba */}
      {(showUpIndicator || showAlways) && (
        <div 
          className={cn(
            "scroll-indicator-up",
            pulseAnimation && "animate-pulse",
            topClassName,
            className
          )}
          onClick={handleScrollUp}
          style={{
            ...horizontalPosition,
            top: offset.top || 20,
          }}
        >
          <ChevronUp size={iconSize} />
        </div>
      )}
      
      {/* Indicador de scroll hacia abajo o arriba cuando estamos al final */}
      {(showDownIndicator || showAlways) && (
        <div 
          className={cn(
            "scroll-indicator-down",
            pulseAnimation && "animate-pulse",
            bottomClassName,
            className
          )}
          onClick={isAtBottom ? handleScrollUp : handleScrollDown}
          style={{
            ...horizontalPosition,
            bottom: offset.bottom || 20,
          }}
        >
          {isAtBottom ? <ChevronUp size={iconSize} /> : <ChevronDown size={iconSize} />}
        </div>
      )}
    </>
  );
} 