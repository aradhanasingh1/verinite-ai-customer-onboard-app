import axios, { AxiosError } from 'axios';

export const verifyAddress = async (
  address: string, 
  city: string, 
  state: string, 
  zipCode: string, 
  country: string
) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  try {
    const response = await axios.post('http://localhost:4000/address/verify', {
      line1: address,
      city,
      state,
      postalCode: zipCode,
      country
    }, {
      signal: controller.signal,
      timeout: 30000
    });

    clearTimeout(timeoutId);
    return response.data;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    
    if (axios.isCancel(error)) {
      console.log('Request was cancelled');
      throw new Error('Address verification request was cancelled');
    } 
    
    const axiosError = error as AxiosError;
    
    if (axiosError.code === 'ECONNABORTED') {
      console.error('Request timed out');
      throw new Error('Address verification request timed out. Please try again.');
    } else if (axiosError.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Server responded with error:', axiosError.response.data);
      throw new Error(
        (axiosError.response.data as { message?: string })?.message || 
        'Failed to verify address. Please try again.'
      );
    } else if (axiosError.request) {
      // The request was made but no response was received
      console.error('No response received:', axiosError.request);
      throw new Error('No response from server. Please check your connection.');
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error setting up request:', axiosError.message);
      throw new Error('Failed to set up address verification. Please try again.');
    }
  }
};