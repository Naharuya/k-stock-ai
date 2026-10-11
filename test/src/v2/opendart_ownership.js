// Placeholder implementation for opendart_ownership
export const fetchDisclosures = async () => {
  return [];
};
export const resolveCorpCode = async (code) => {
  return code;
};
export const getDisclosure = async (id) => {
  return {
    id,
    title: 'Sample Disclosure',
    date: new Date().toISOString(),
  };
};