/** Resolve required harness markup once and validate its element type. */
export function element<T extends HTMLElement>(
  id: string,
  type: new () => T,
): T {
  const found = document.getElementById(id);
  if (!(found instanceof type))
    throw new Error(`Missing harness element: ${id}`);
  return found;
}
