import { useEquipment } from '@/contexts/equipment-context';
import { useState } from 'react';

export default function EquipmentForm() {
  const { saveEquipment } = useEquipment();
  const [name, setName] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Datos básicos del equipo
    const equipmentData = {
      name,
      clinicId: 123, // Ejemplo, deberías obtener esto de algún contexto
      // ... otros campos ...
    };
    
    // Guardar equipo con imágenes
    const success = await saveEquipment(equipmentData, imageFiles);
    
    if (success) {
      // Limpiar formulario o redirigir
      setName('');
      setImageFiles([]);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImageFiles(Array.from(e.target.files));
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Nombre del equipo</label>
        <input 
          type="text" 
          value={name} 
          onChange={e => setName(e.target.value)} 
          required 
        />
      </div>
      
      <div>
        <label>Imágenes</label>
        <input 
          type="file" 
          accept="image/*" 
          multiple 
          onChange={handleFileChange} 
        />
        {imageFiles.length > 0 && (
          <p>{imageFiles.length} imágenes seleccionadas</p>
        )}
      </div>
      
      <button type="submit">Guardar Equipo</button>
    </form>
  );
} 