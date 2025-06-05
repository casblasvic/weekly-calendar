"use client";

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { useDropzone } from 'react-dropzone';
import { FileUp, AlertCircle, Upload, X } from 'lucide-react';
import Papa from 'papaparse';
import { toast } from '@/components/ui/use-toast';
import { importChartOfAccountsFromCSV } from './plan-contable/actions';

interface CSVImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  legalEntityId: string;
  onImportComplete?: () => void;
}

interface CSVRow {
  accountNumber: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  parentNumber?: string;
  isMonetary?: boolean;
  allowDirectEntry?: boolean;
}

export function CSVImporterModal({ 
  isOpen, 
  onClose, 
  legalEntityId, 
  onImportComplete 
}: CSVImporterModalProps) {
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFileName(file.name);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as any[];
        const validatedRows: CSVRow[] = rows.map(row => ({
          accountNumber: row.accountNumber || row.account_number || row.codigo || '',
          name: row.name || row.nombre || row.description || '',
          type: (row.type || row.tipo || 'ASSET').toUpperCase() as CSVRow['type'],
          parentNumber: row.parentNumber || row.parent_number || row.cuenta_padre || undefined,
          isMonetary: row.isMonetary === 'true' || row.is_monetary === 'true' || row.monetaria === 'si',
          allowDirectEntry: row.allowDirectEntry !== 'false' && row.allow_direct_entry !== 'false'
        })).filter(row => row.accountNumber && row.name);
        
        setCsvData(validatedRows);
        
        if (validatedRows.length === 0) {
          toast({
            title: 'Error',
            description: 'No se encontraron filas válidas en el archivo CSV',
            variant: 'destructive'
          });
        }
      },
      error: (error) => {
        toast({
          title: 'Error al leer el archivo',
          description: error.message,
          variant: 'destructive'
        });
      }
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'text/plain': ['.csv']
    },
    maxFiles: 1
  });

  const handleImport = async () => {
    if (csvData.length === 0) return;
    
    setIsImporting(true);
    try {
      const result = await importChartOfAccountsFromCSV(legalEntityId, csvData);
      
      toast({
        title: 'Importación completada',
        description: `Se importaron ${result.accountsCreated} cuentas correctamente`,
      });
      
      onImportComplete?.();
      handleClose();
    } catch (error) {
      console.error('Error importing:', error);
      toast({
        title: 'Error en la importación',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive'
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setCsvData([]);
    setFileName('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar Plan Contable desde CSV</DialogTitle>
          <DialogDescription>
            Importa cuentas contables adicionales desde un archivo CSV
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {csvData.length === 0 ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}`}
            >
              <input {...getInputProps()} />
              <FileUp className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                {isDragActive ? 'Suelta el archivo aquí...' : 'Arrastra un archivo CSV o haz clic para seleccionar'}
              </p>
            </div>
          ) : (
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{fileName}</span>
                  <span className="text-sm text-muted-foreground">
                    ({csvData.length} cuentas)
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCsvData([]);
                    setFileName('');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Las cuentas se importarán directamente a la entidad legal actual.
                  Las cuentas duplicadas serán ignoradas.
                </AlertDescription>
              </Alert>
            </Card>
          )}
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button 
              onClick={handleImport}
              disabled={csvData.length === 0 || isImporting}
            >
              {isImporting ? 'Importando...' : `Importar ${csvData.length} cuentas`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
