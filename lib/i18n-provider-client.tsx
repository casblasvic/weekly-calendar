'use client'; // Este proveedor se usará en el cliente

import React, { type ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18nInstance from './i18n-config'; // Importar la instancia configurada

interface Props {
  children: ReactNode;
}

export default function I18nProviderClient({ children }: Props) {
  return (
    <I18nextProvider i18n={i18nInstance}>
      {children}
    </I18nextProvider>
  );
} 