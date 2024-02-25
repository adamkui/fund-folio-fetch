/* eslint-disable no-plusplus, no-await-in-loop */
export async function asyncForEach<T>(array: Array<T>, callback: (item: T, index: number) => Promise<void>) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index);
  }
}
/* eslint-enable no-plusplus, no-await-in-loop */
