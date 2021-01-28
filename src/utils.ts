import type { JSHandle } from 'puppeteer';

export const jsHandleToArray = async (arrayHandle: JSHandle) => {
  const properties = await arrayHandle.getProperties();
  const arr = new Array(properties.size);
  for (let i = 0; i < properties.size; i++) {
    const valHandle = properties.get(String(i));
    if (valHandle) {
      // Change primitives to live values rather than JSHandles
      const val = await valHandle.jsonValue();
      arr[i] = typeof val === 'object' ? valHandle : val;
    }
  }
  return arr;
};
