"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Check, ChevronsUpDown, User, Phone, MapPin, AtSign, Building, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { useClientsQuery, useClientByIdQuery, type ClientForSelector } from '@/lib/hooks/use-client-query';
import { useTranslation } from 'react-i18next';

interface ClientSelectorSearchProps {
  selectedClientId?: string;
  onClientSelect: (client: ClientForSelector | null) => void;
  setFormValue: <T extends string>(field: T, value: any, options?: object) => void;
}

export function ClientSelectorSearch({ selectedClientId, onClientSelect, setFormValue }: ClientSelectorSearchProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedClientInternal, setSelectedClientInternal] = useState<ClientForSelector | null>(null);
  const [searchValue, setSearchValue] = useState<string>("");

  const { data: searchedClients = [], isLoading: isLoadingSearch, isError: isErrorSearch } = useClientsQuery(
    { search: searchValue }, 
    { enabled: open }
  );

  const { 
    data: initialClient, 
    isLoading: isLoadingInitialClient,
  } = useClientByIdQuery(selectedClientId, {
    enabled: !!selectedClientId && !open && (!selectedClientInternal || selectedClientInternal.id !== selectedClientId),
  });

  const handleClear = () => {
    setSelectedClientInternal(null);
    setIsDetailsOpen(false);
    setFormValue("clientId", undefined, { shouldValidate: true });
    setFormValue("clientName", undefined);
    setFormValue("clientDetails", undefined);
    onClientSelect(null);
    setSearchValue("");
  };

  useEffect(() => {
    if (selectedClientId) {
      if (initialClient) {
        if (!selectedClientInternal || selectedClientInternal.id !== initialClient.id) {
          setSelectedClientInternal(initialClient);
          setIsDetailsOpen(true);
          const clientDisplayName = `${initialClient.firstName} ${initialClient.lastName}${initialClient.company?.fiscalName ? ` (${initialClient.company.fiscalName})` : initialClient.fiscalName ? ` (${initialClient.fiscalName})` : ''}`;
          setFormValue("clientId", initialClient.id, { shouldValidate: true });
          setFormValue("clientName", clientDisplayName);
          setFormValue("clientDetails", initialClient);
          onClientSelect(initialClient);
        }
      } else if (!isLoadingInitialClient) {
        if (selectedClientInternal !== null && selectedClientInternal.id === selectedClientId) {
          handleClear();
        } else if (selectedClientInternal === null && selectedClientId) {
        }
      }
    } else {
      if (selectedClientInternal) {
        handleClear();
      }
    }
  }, [
    selectedClientId, 
    initialClient, 
    isLoadingInitialClient, 
    selectedClientInternal, 
    setFormValue, 
    onClientSelect,
  ]);

  const handleSelect = (client: ClientForSelector) => {
    setSelectedClientInternal(client);
    setIsDetailsOpen(true);
    const clientDisplayName = `${client.firstName} ${client.lastName}${client.company?.fiscalName ? ` (${client.company.fiscalName})` : client.fiscalName ? ` (${client.fiscalName})` : ''}`;
    setFormValue("clientId", client.id, { shouldValidate: true });
    setFormValue("clientName", clientDisplayName);
    setFormValue("clientDetails", client);
    onClientSelect(client);
    setOpen(false);
    setSearchValue("");
  };

  const displayClientName = useMemo(() => {
    if (isLoadingInitialClient && selectedClientId && (!selectedClientInternal || selectedClientInternal.id !== selectedClientId)) {
      return t('common.loading');
    }
    if (!selectedClientInternal) return t('tickets.selectClient');
    let name = `${selectedClientInternal.firstName} ${selectedClientInternal.lastName}`;
    if (selectedClientInternal.company?.fiscalName) {
      name += ` (${selectedClientInternal.company.fiscalName})`;
    } else if (selectedClientInternal.fiscalName) {
      name += ` (${selectedClientInternal.fiscalName})`;
    }
    return name;
  }, [selectedClientInternal, t, isLoadingInitialClient, selectedClientId]);

  return (
    <div className="w-full space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-700">{t('tickets.client')}</h2>
          {selectedClientInternal && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClear}
              className="h-7 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              {t('common.clearSelection')}
            </Button>
          )}
        </div>
        
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between h-9 px-3 py-1 text-sm border-gray-300 bg-white hover:bg-gray-50"
              disabled={isLoadingInitialClient && !selectedClientInternal && !!selectedClientId}
            >
              {selectedClientInternal ? (
                <span className="flex items-center truncate">
                  <User className="mr-2 h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                  <span className="font-medium truncate">{displayClientName}</span>
                </span>
              ) : isLoadingInitialClient && !!selectedClientId ? (
                <span className="text-muted-foreground flex items-center">
                  <User className="mr-2 h-3.5 w-3.5" />
                  {t('common.loading')}
                </span>
              ) : (
                <span className="text-muted-foreground flex items-center">
                  <User className="mr-2 h-3.5 w-3.5" />
                  {t('tickets.searchClientPlaceholder')}
                </span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[450px] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput 
                placeholder={t('tickets.searchClientPlaceholder')}
                className="h-9"
                value={searchValue}
                onValueChange={setSearchValue}
              />
              {isLoadingSearch && <CommandEmpty>{t('common.loading')}</CommandEmpty>}
              {isErrorSearch && <CommandEmpty>{t('common.errors.loadingDesc')}</CommandEmpty>}
              {!isLoadingSearch && !isErrorSearch && searchedClients.length === 0 && searchValue && (
                <CommandEmpty>{t('tickets.clientNotFound')}</CommandEmpty>
              )}
              {!isLoadingSearch && !isErrorSearch && searchedClients.length === 0 && !searchValue && (
                <CommandEmpty>{t('tickets.searchClientPlaceholder')}</CommandEmpty>
              )}
              <CommandGroup className="max-h-[300px] overflow-y-auto">
                {searchedClients.map((client) => (
                  <CommandItem
                    key={client.id}
                    value={`${client.firstName} ${client.lastName} ${client.taxId || ''} ${client.email || ''}`}
                    onSelect={() => handleSelect(client)}
                    className="py-2 cursor-pointer"
                  >
                    <div className="flex flex-col w-full">
                      <div className="flex items-center">
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedClientInternal?.id === client.id ? "opacity-100 text-purple-600" : "opacity-0"
                          )}
                        />
                        <span className="font-medium">{client.firstName} {client.lastName}</span>
                        {(client.company?.fiscalName || client.fiscalName) && (
                          <Badge variant="outline" className="ml-2 text-xs py-0 px-1.5 h-5">
                            {client.company?.fiscalName || client.fiscalName}
                          </Badge>
                        )}
                      </div>
                      <div className="ml-6 flex items-center text-xs text-gray-500 mt-0.5 space-x-2">
                        {client.taxId && <span className="flex items-center"><Hash className="mr-1 h-3 w-3 flex-shrink-0" /> {client.taxId}</span>}
                        {client.phone && <span className="flex items-center"><Phone className="mr-1 h-3 w-3 flex-shrink-0" /> {client.phoneCountryIsoCode && `(+${client.phoneCountryIsoCode}) `}{client.phone}</span>}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {selectedClientInternal && (
        <Collapsible
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          className="border rounded-md bg-gray-50/50"
        >
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-100/80 transition-colors rounded-t-md">
              <h3 className="text-sm font-medium flex items-center text-gray-700">
                <User className="mr-2 h-4 w-4 text-gray-500" />
                {t('tickets.clientDetails')}
              </h3>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <ChevronsUpDown className="h-4 w-4" />
              </Button>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-3 pb-3 pt-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0.5 text-sm">
                <InfoItem icon={User} label={t('common.name')} value={`${selectedClientInternal.firstName} ${selectedClientInternal.lastName}`} />
                {(selectedClientInternal.company?.fiscalName || selectedClientInternal.fiscalName) && 
                  <InfoItem icon={Building} label={t('client.companyName', 'Empresa')} value={selectedClientInternal.company?.fiscalName || selectedClientInternal.fiscalName} />
                }
                {selectedClientInternal.taxId && 
                  <InfoItem icon={Hash} label={t('client.taxId', 'NIF/CIF')} value={selectedClientInternal.taxId} />
                }
                {selectedClientInternal.phone && 
                  <InfoItem icon={Phone} label={t('client.phone', 'Teléfono')} value={`${selectedClientInternal.phoneCountryIsoCode ? `(+${selectedClientInternal.phoneCountryIsoCode}) ` : ''}${selectedClientInternal.phone}`} />
                }
                {selectedClientInternal.email && 
                  <InfoItem icon={AtSign} label={t('client.email', 'Email')} value={selectedClientInternal.email} />
                }
                {selectedClientInternal.address && 
                  <InfoItem icon={MapPin} label={t('client.address', 'Dirección')} value={`${selectedClientInternal.address}${selectedClientInternal.city ? `, ${selectedClientInternal.city}` : ''}${selectedClientInternal.postalCode ? ` (${selectedClientInternal.postalCode})` : ''}`} />
                }
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

const InfoItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | null | undefined }) => {
  if (!value) return null;
  return (
    <div className="flex items-start py-1.5">
      <Icon className="mr-2 h-3.5 w-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
      <div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className="font-medium text-xs text-gray-700">{value}</div>
      </div>
    </div>
  );
}; 