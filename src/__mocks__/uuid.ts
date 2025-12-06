/**
 * UUID Mock for Jest
 */

let counter = 0;

export const v4 = (): string => {
  counter++;
  return `mock-uuid-${counter.toString().padStart(8, '0')}`;
};

export const reset = (): void => {
  counter = 0;
};

export default { v4 };
