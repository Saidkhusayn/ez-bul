// types.ts
export interface LocationOption {
    value: string;
    label: string;
  }
  
  export interface Host {
    _id: string;
    name: string;
    profilePicture: string;
    type: 'Volunteer' | 'Paid';
    rate: number;
    languages: string[];
    open: 'Yes' | 'No';
    bio: string;
    country?: string;
    province?: string;
    city?: string;
  }
  
  export interface Filters {
    type?: 'Volunteer' | 'Paid';
    languages: string[];
    country?: string;
    province?: string;
    city?: string;
  }