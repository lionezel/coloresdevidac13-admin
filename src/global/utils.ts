/**
 * Removes all properties with value `undefined` from an object recursively.
 * This is necessary because Firestore does not support `undefined` values.
 */
export function removeUndefined(obj: any): any {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(removeUndefined);
  }

  return Object.keys(obj).reduce((acc: any, key) => {
    const value = obj[key];
    if (value !== undefined) {
      acc[key] = removeUndefined(value);
    }
    return acc;
  }, {});
}
