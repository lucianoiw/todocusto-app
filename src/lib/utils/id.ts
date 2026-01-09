import { nanoid } from "nanoid";

export function generateId(prefix?: string) {
  const id = nanoid(21);
  return prefix ? `${prefix}_${id}` : id;
}

export function generateSlug(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
