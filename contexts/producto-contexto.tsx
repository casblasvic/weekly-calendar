"use client"

import React, { createContext, useState, useContext, useEffect, ReactNode } from "react"

// Interfaces
export interface Producto {
  id: string
  nombre: string
  codigo: string
  descripcion: string
  familia: string
  stock: number
  stockMinimo: number
  precioCompra: number
  precioVenta: number
  iva: string
  tarifaId: string
  activo: boolean
  fechaCreacion: string
}

interface ProductoContextType {
  productos: Producto[]
  addProducto: (producto: Omit<Producto, "id" | "fechaCreacion">) => string
  updateProducto: (id: string, productoActualizado: Partial<Producto>) => void
  deleteProducto: (id: string) => void
  getProductoById: (id: string) => Producto | undefined
  getProductosByTarifaId: (tarifaId: string) => Producto[]
  getProductosByFamilia: (familia: string) => Producto[]
  toggleProductoStatus: (id: string) => void
}

// Datos iniciales de ejemplo
const initialProductos: Producto[] = [
  { 
    id: "prod-1", 
    nombre: "Gel frío", 
    codigo: "GF001", 
    descripcion: "Gel frío para tratamientos", 
    familia: "1", 
    stock: 100, 
    stockMinimo: 20,
    precioCompra: 15.50,
    precioVenta: 25.00,
    iva: "iva-2",
    tarifaId: "tarifa-california",
    activo: true,
    fechaCreacion: new Date().toISOString()
  },
  { 
    id: "prod-2", 
    nombre: "Crema hidratante", 
    codigo: "CH002", 
    descripcion: "Crema hidratante de alta calidad", 
    familia: "1", 
    stock: 50, 
    stockMinimo: 10,
    precioCompra: 12.00,
    precioVenta: 22.50,
    iva: "iva-2",
    tarifaId: "tarifa-california",
    activo: true,
    fechaCreacion: new Date().toISOString()
  },
  { 
    id: "prod-3", 
    nombre: "Gel conductor", 
    codigo: "GC003", 
    descripcion: "Gel conductor para tratamientos con aparatología", 
    familia: "2", 
    stock: 75, 
    stockMinimo: 15,
    precioCompra: 18.25,
    precioVenta: 30.00,
    iva: "iva-4",
    tarifaId: "tarifa-california",
    activo: true,
    fechaCreacion: new Date().toISOString()
  },
  { 
    id: "prod-4", 
    nombre: "Aceite esencial", 
    codigo: "AE004", 
    descripcion: "Aceite esencial para masajes", 
    familia: "3", 
    stock: 30, 
    stockMinimo: 5,
    precioCompra: 22.75,
    precioVenta: 45.00,
    iva: "iva-3",
    tarifaId: "tarifa-california",
    activo: true,
    fechaCreacion: new Date().toISOString()
  },
  { 
    id: "prod-5", 
    nombre: "Loción calmante", 
    codigo: "LC005", 
    descripcion: "Loción calmante post-tratamiento", 
    familia: "1", 
    stock: 45, 
    stockMinimo: 10,
    precioCompra: 16.50,
    precioVenta: 28.00,
    iva: "iva-2",
    tarifaId: "tarifa-california",
    activo: true,
    fechaCreacion: new Date().toISOString()
  }
];

// Crear el contexto
const ProductoContext = createContext<ProductoContextType | undefined>(undefined);

// Proveedor del contexto
export const ProductoProvider = ({ children }: { children: ReactNode }) => {
  const [productos, setProductos] = useState<Producto[]>(initialProductos);

  // Cargar desde localStorage si existe
  useEffect(() => {
    const storedProductos = localStorage.getItem("productos");
    if (storedProductos) {
      setProductos(JSON.parse(storedProductos));
    }
  }, []);

  // Guardar en localStorage cuando cambien
  useEffect(() => {
    localStorage.setItem("productos", JSON.stringify(productos));
  }, [productos]);

  // Funciones para gestionar productos
  const addProducto = (producto: Omit<Producto, "id" | "fechaCreacion">) => {
    const id = `prod-${Date.now()}`;
    const nuevoProducto = { 
      ...producto, 
      id, 
      fechaCreacion: new Date().toISOString() 
    };
    setProductos(prev => [...prev, nuevoProducto]);
    return id;
  };

  const updateProducto = (id: string, productoActualizado: Partial<Producto>) => {
    setProductos(prev => 
      prev.map(producto => 
        producto.id === id ? { ...producto, ...productoActualizado } : producto
      )
    );
  };

  const deleteProducto = (id: string) => {
    setProductos(prev => prev.filter(producto => producto.id !== id));
  };

  const getProductoById = (id: string) => {
    return productos.find(producto => producto.id === id);
  };

  const getProductosByTarifaId = (tarifaId: string) => {
    return productos.filter(producto => producto.tarifaId === tarifaId && producto.activo);
  };

  const getProductosByFamilia = (familia: string) => {
    return productos.filter(producto => producto.familia === familia && producto.activo);
  };

  const toggleProductoStatus = (id: string) => {
    setProductos(prev => 
      prev.map(producto => 
        producto.id === id ? { ...producto, activo: !producto.activo } : producto
      )
    );
  };

  return (
    <ProductoContext.Provider value={{ 
      productos, 
      addProducto, 
      updateProducto, 
      deleteProducto, 
      getProductoById, 
      getProductosByTarifaId, 
      getProductosByFamilia,
      toggleProductoStatus
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