declare module 'react-select-country-list' {
  export interface CountryData {
    label: string;
    value: string;
  }

  export default function countryList(): {
    getData: () => CountryData[];
    getLabel: (value: string) => string;
    getValue: (label: string) => string;
    getValueByIndex: (index: number) => string;
    getLabelByIndex: (index: number) => string;
    getLabels: () => string[];
    getValues: () => string[];
  };
} 