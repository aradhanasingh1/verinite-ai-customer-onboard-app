export interface FormData {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  idType: string;
  idNumber: string;
  dateOfBirth: string;
  occupation: string;
  annualIncome: string;
  sourceOfFunds: string;
  purposeOfAccount: string;
  termsAccepted: boolean;
}

export interface FormStepProps {
  formData: FormData;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  errors?: Record<string, string>;
}
