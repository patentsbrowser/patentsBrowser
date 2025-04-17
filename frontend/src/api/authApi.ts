export const authApi = {
  searchPatents: async (query: string) => {
    const response = await axios.get(`${API_URL}/patents/search?query=${encodeURIComponent(query)}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response;
  },
}; 