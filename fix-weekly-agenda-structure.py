#!/usr/bin/env python3
"""
Script para arreglar la estructura del componente WeeklyAgenda
Mueve el DragPreview y los modales dentro del return statement
"""

import re

def fix_weekly_agenda():
    # Leer el archivo
    with open('components/weekly-agenda.tsx', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Buscar el patrón problemático donde el DragPreview está fuera del return
    # Encontrar la línea donde termina el primer </div> dentro del return
    # y mover todo el contenido de los modales ahí
    
    # Primero, encontrar dónde empieza el bloque problemático
    drag_preview_start = content.find("// Renderizar el preview si está activo")
    if drag_preview_start == -1:
        drag_preview_start = content.find("{localDragState.isActive && localDragState.draggedItem")
    
    # Encontrar dónde termina el bloque de modales (antes del return)
    # Buscar el patrón del return statement principal
    return_pattern = r'// Return original para cuando se usa de forma independiente\s*return \('
    return_match = re.search(return_pattern, content)
    
    if not return_match:
        print("No se encontró el return statement principal")
        return False
    
    # Extraer el contenido entre el DragPreview y el return
    modals_content = content[drag_preview_start:return_match.start()].strip()
    
    # Eliminar ese contenido de su posición actual
    content_before = content[:drag_preview_start].rstrip()
    content_after = content[return_match.start():]
    
    # Ahora necesitamos insertar los modales dentro del return
    # Buscar el cierre del div principal dentro del HydrationWrapper
    # Patrón: </div> seguido de </HydrationWrapper>
    insert_pattern = r'(</div>\s*)(</HydrationWrapper>)'
    
    def replacer(match):
        return match.group(1) + '\n\n      ' + modals_content.replace('\n', '\n      ') + '\n    ' + match.group(2)
    
    # Aplicar el reemplazo en el content_after
    content_after_fixed = re.sub(insert_pattern, replacer, content_after, count=1)
    
    # Combinar todo
    final_content = content_before + '\n\n  ' + content_after_fixed
    
    # Escribir el archivo corregido
    with open('components/weekly-agenda.tsx', 'w', encoding='utf-8') as f:
        f.write(final_content)
    
    print("Archivo corregido exitosamente")
    return True

if __name__ == "__main__":
    fix_weekly_agenda()
