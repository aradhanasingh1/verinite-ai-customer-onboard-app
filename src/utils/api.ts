import axios from 'axios';

export const verifyAddress = async (
  address: string, 
  city: string, 
  state: string, 
  zipCode: string, 
  country: string
) => {
  try {
    const response = await axios.post('http://localhost:4000/address/verify', {
      line1: address,  // Changed from 'address' to 'line1'
      city,
      state,
      postalCode: zipCode,  // Changed from 'zipCode' to 'postalCode'
      country
    });
    return response.data;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('Request was aborted');
      return;
    }
    console.error('Error verifying address:', error);
    throw error;
  }
};