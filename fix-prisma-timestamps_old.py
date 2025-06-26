#!/usr/bin/env python3
import re

# Leer el archivo schema.prisma
with open('prisma/schema.prisma', 'r') as f:
    content = f.read()

# Definir los modelos y campos que necesitan @db.Timestamptz()
models_to_update = {
    'Appointment': [
        'startTime',
        'endTime', 
        'deviceActivationTimestamp',
        'deviceDeactivationTimestamp',
        'createdAt',
        'updatedAt'
    ],
    'AppointmentExtension': [
        'createdAt'
    ],
    'AppointmentService': [
        'validatedAt',
        'createdAt',
        'updatedAt'
    ]
}

# Función para agregar @db.Timestamptz() a un campo DateTime
def add_timestamptz(content, model_name, field_name):
    # Buscar el patrón del campo dentro del modelo
    pattern = rf'(model\s+{model_name}\s*{{[^}}]*{field_name}\s+DateTime)(\s*[^@\n]*?)(\n)'
    
    def replacer(match):
        field_def = match.group(1)
        existing_attrs = match.group(2)
        newline = match.group(3)
        
        # Si ya tiene @db.Timestamptz(), no hacer nada
        if '@db.Timestamptz()' in existing_attrs:
            return match.group(0)
        
        # Agregar @db.Timestamptz() al final de los atributos existentes
        return field_def + existing_attrs + ' @db.Timestamptz()' + newline
    
    return re.sub(pattern, replacer, content, flags=re.DOTALL)

# Aplicar los cambios
for model_name, fields in models_to_update.items():
    for field_name in fields:
        content = add_timestamptz(content, model_name, field_name)

# Guardar el archivo actualizado
with open('prisma/schema.prisma', 'w') as f:
    f.write(content)

print("Schema actualizado con @db.Timestamptz() en los campos necesarios")
