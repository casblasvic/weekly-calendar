"use client"

import React, { createContext, useState, useContext, useEffect, ReactNode } from "react"
import { useInterfaz } from "./interfaz-Context"
import { Producto as ProductoModel } from "@/services/data/models/interfaces"

// Utilizamos el tipo del modelo central
export type Producto = ProductoModel;

interface ProductoContextType {
  productos: Producto[];
  loading: boolean;
  addProducto: (producto: Omit<Producto, "id" | "fechaCreacion">) => Promise<string>;
  updateProducto: (id: string, productoActualizado: Partial<Producto>) => Promise<void>;
  deleteProducto: (id: string) => Promise<void>;
  getProductoById: (id: string) => Promise<Producto | undefined>;
  getProductosByTarifaId: (tarifaId: string) => Promise<Producto[]>;
  getProductosByFamilia: (familia: string) => Promise<Producto[]>;
  toggleProductoStatus: (id: string) => Promise<void>;
  refreshProductos: () => Promise<void>;
}

// Crear el contexto
const ProductoContext = createContext<ProductoContextType | undefined>(undefined);

// Proveedor del contexto
export const ProductoProvider = ({ children }: { children: ReactNode }) => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataFetched, setDataFetched] = useState(false);
  const interfaz = useInterfaz();

  // Cargar datos iniciales utilizando la interfaz
  useEffect(() => {
    if (interfaz.initialized && !dataFetched) {
      loadProductos();
    }
  }, [interfaz.initialized, dataFetched]);

  // Función para cargar productos
  const loadProductos = async () => {
    try {
      setLoading(true);
      
      // Cargar desde la interfaz centralizada
      const data = await interfaz.getAllProductos();
      setProductos(data);
      
      setDataFetched(true);
    } catch (error) {
      console.error("Error al cargar productos:", error);
    } finally {
      setLoading(false);
    }
  };

  // Funciones para gestionar productos
  const addProducto = async (producto: Omit<Producto, "id" | "fechaCreacion">) => {
    try {
      const nuevoProducto = await interfaz.createProducto(producto);
      if (nuevoProducto && nuevoProducto.id) {
        setProductos(prev => [...prev, nuevoProducto]);
        return nuevoProducto.id;
      } else {
        throw new Error("No se pudo crear el producto");
      }
    } catch (error) {
      console.error("Error al añadir producto:", error);
      throw error;
    }
  };

  const updateProducto = async (id: string, productoActualizado: Partial<Producto>) => {
    try {
      const updated = await interfaz.updateProducto(id, productoActualizado);
      if (updated) {
        setProductos(prev => 
          prev.map(producto => 
            producto.id === id ? { ...producto, ...productoActualizado } : producto
          )
        );
      }
    } catch (error) {
      console.error("Error al actualizar producto:", error);
      throw error;
    }
  };

  const deleteProducto = async (id: string) => {
    try {
      const success = await interfaz.deleteProducto(id);
      if (success) {
        setProductos(prev => prev.filter(producto => producto.id !== id));
      } else {
        throw new Error("No se pudo eliminar el producto");
      }
    } catch (error) {
      console.error("Error al eliminar producto:", error);
      throw error;
    }
  };

  const getProductoById = async (id: string) => {
    try {
      const producto = await interfaz.getProductoById(id);
      return producto || undefined;
    } catch (error) {
      console.error("Error al obtener producto por ID:", error);
      return undefined;
    }
  };

  const getProductosByTarifaId = async (tarifaId: string) => {
    try {
      const productos = await interfaz.getProductosByTarifaId(tarifaId);
      return productos || [];
    } catch (error) {
      console.error("Error al obtener productos por tarifa:", error);
      return [];
    }
  };

  const getProductosByFamilia = async (familia: string) => {
    try {
      const productos = await interfaz.getProductosByFamilia(familia);
      return productos || [];
    } catch (error) {
      console.error("Error al obtener productos por familia:", error);
      return [];
    }
  };

  const toggleProductoStatus = async (id: string) => {
    try {
      // Buscar producto primero
      const producto = await interfaz.getProductoById(id);
      if (!producto) return;
      
      // Cambiar estado
      const activo = !producto.activo;
      
      // Actualizar producto a través de la interfaz
      await interfaz.updateProducto(id, { activo });
      
      // Actualizar estado local si la actualización tuvo éxito
      setProductos(prev => 
        prev.map(p => 
          p.id === id ? { ...p, activo } : p
        )
      );
    } catch (error) {
      console.error("Error al cambiar estado del producto:", error);
      throw error;
    }
  };
  
  const refreshProductos = async () => {
    setDataFetched(false); // Esto forzará la recarga en el useEffect
  };

  return (
    <ProductoContext.Provider value={{ 
      productos, 
      loading,
      addProducto, 
      updateProducto, 
      deleteProducto, 
      getProductoById, 
      getProductosByTarifaId, 
      getProductosByFamilia,
      toggleProductoStatus,
      refreshProductos
    }}>
      {children}
    </ProductoContext.Provider>
  );
};

// Hook personalizado para usar el contexto
export const useProducto = () => {
  const context = useContext(ProductoContext);
  if (context === undefined) {
    throw new Error('useProducto debe ser usado dentro de un ProductoProvider');
  }
  return context;
}; 