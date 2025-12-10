export const verifyAddress = async (address: string) => {
  try {
    const response = await fetch('http://localhost:5000/verify-address', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address }),
    });

    if (!response.ok) {
      throw new Error('Failed to verify address');
    }

    return await response.json();
  } catch (error) {
    console.error('Address verification error:', error);
    throw error;
  }
};