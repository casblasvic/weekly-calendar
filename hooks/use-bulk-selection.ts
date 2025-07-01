import { useState, useMemo } from 'react';

export interface SelectableItem {
  id: string;
}

export const useBulkSelection = <T extends SelectableItem>(items: T[]) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectionState = useMemo(() => {
    const totalItems = items.length;
    const selectedCount = selectedIds.length;
    
    return {
      selectedCount,
      totalItems,
      isAllSelected: selectedCount === totalItems && totalItems > 0,
      isIndeterminate: selectedCount > 0 && selectedCount < totalItems,
      hasSelection: selectedCount > 0,
      selectedItems: items.filter(item => selectedIds.includes(item.id))
    };
  }, [items, selectedIds]);

  const isSelected = (id: string) => selectedIds.includes(id);

  const toggleItem = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(itemId => itemId !== id)
        : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedIds(items.map(item => item.id));
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const toggleAll = () => {
    if (selectionState.isAllSelected) {
      clearSelection();
    } else {
      selectAll();
    }
  };

  // Reset selection when items change significantly
  const resetIfNeeded = (newItems: T[]) => {
    const validIds = newItems.map(item => item.id);
    const invalidSelected = selectedIds.filter(id => !validIds.includes(id));
    
    if (invalidSelected.length > 0) {
      setSelectedIds(prev => prev.filter(id => validIds.includes(id)));
    }
  };

  return {
    selectedIds,
    ...selectionState,
    isSelected,
    toggleItem,
    selectAll,
    clearSelection,
    toggleAll,
    resetIfNeeded
  };
}; 