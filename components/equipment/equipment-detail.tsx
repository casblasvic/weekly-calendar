import { useEquipment } from '@/contexts/equipment-context';
import Image from 'next/image';

export default function EquipmentDetail({ equipmentId }: { equipmentId: number }) {
  const { getEquipment, getEquipmentImages, getEquipmentPrimaryImage } = useEquipment();
  
  const equipment = getEquipment(equipmentId);
  const images = getEquipmentImages(equipmentId);
  const primaryImage = getEquipmentPrimaryImage(equipmentId);
  
  if (!equipment) {
    return <div>Equipo no encontrado</div>;
  }
  
  return (
    <div>
      <h1>{equipment.name}</h1>
      
      {/* Imagen principal */}
      {primaryImage && (
        <div className="primary-image">
          <Image 
            src={primaryImage.url} 
            alt={`Imagen principal de ${equipment.name}`} 
            width={300} 
            height={200}
          />
        </div>
      )}
      
      {/* Todas las imágenes */}
      {images.length > 0 ? (
        <div className="gallery">
          {images.map(image => (
            <div key={image.id} className="thumbnail">
              <Image 
                src={image.url} 
                alt={`Imagen de ${equipment.name}`} 
                width={100} 
                height={100}
              />
            </div>
          ))}
        </div>
      ) : (
        <p>No hay imágenes disponibles</p>
      )}
    </div>
  );
} 