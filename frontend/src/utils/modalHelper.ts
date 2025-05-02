/**
 * Helper functions to manage modal state globally
 * This ensures the chat widget is hidden when modals are open
 */

/**
 * Set the global modal state
 * @param isOpen Whether any modal is currently open
 */
export const setModalState = (isOpen: boolean): void => {
  if (typeof window !== 'undefined') {
    (window as any).isModalOpen = isOpen;
    
    // If there's a setter function available, use it
    if (typeof (window as any).setIsModalOpen === 'function') {
      (window as any).setIsModalOpen(isOpen);
    }
  }
};

/**
 * Get the current modal state
 * @returns Whether any modal is currently open
 */
export const getModalState = (): boolean => {
  if (typeof window !== 'undefined') {
    return !!(window as any).isModalOpen;
  }
  return false;
};

/**
 * Use this function at the beginning of your modal component
 * It automatically sets the modal state to open
 */
export const openModal = (): void => {
  setModalState(true);
};

/**
 * Use this function when closing your modal component
 * It automatically sets the modal state to closed
 */
export const closeModal = (): void => {
  setModalState(false);
};

export default {
  setModalState,
  getModalState,
  openModal,
  closeModal,
}; 