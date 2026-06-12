import { useState } from 'react';
import storageService from '../services/storageService';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void, () => void] {
  // Get initial value from localStorage or use provided initial value
  const [storedValue, setStoredValue] = useState<T>(() => {
    const item = storageService.get<T>(key);
    return item !== null ? item : initialValue;
  });

  // Update localStorage when state changes
  const setValue = (value: T) => {
    setStoredValue(value);
    storageService.set(key, value);
  };

  // Remove value from localStorage
  const removeValue = () => {
    setStoredValue(initialValue);
    storageService.remove(key);
  };

  return [storedValue, setValue, removeValue];
}
