// types.ts

export interface Host {
  _id: string;
  name: string;
  profilePicture: string;
  type: 'Volunteer' | 'Paid';
  rate: number;
  languages: { value: string; label: string }[];
  open: 'Yes' | 'No';
  bio: string;
  country?: { value: string; label: string };
  province?: { value: string; label: string };
  city?: { value: string; label: string };
}

export interface LocationOption {
    value: string;
    label: string;
}
 
export interface Filter {
  country: LocationOption | undefined;
  province: LocationOption | undefined;
  city:LocationOption | undefined;
  languages: LocationOption[],
  type: 'Volunteer' | 'Paid' | undefined,
  [key: string]: any; //change it to make it more specific
}