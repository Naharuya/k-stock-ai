// Stub for OpenDART ownership connector
// This is a mock implementation for testing purposes
// KSTOCK_AI_MODE=mock is enforced
// No real API calls or data fetching
// All responses are mocked

export const fetchOpenDARTOwnership = async () => {
  return {
    status: 'success',
    data: {
      company: 'Mock Company Inc.',
      ownership: {
        director: 'John Doe',
        percentage: '15%',
        date: '2023-09-30'
      }
    }
  };
};