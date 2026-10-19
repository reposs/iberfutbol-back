/**
 * Value Object que garantiza que todos los slugs SEO cumplan formato URL-safe
 * (minúsculas, guiones, sin caracteres especiales ni acentos).
 */
export class Slug {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  public static create(raw: string): Slug {
    const normalized = raw
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!normalized) {
      throw new Error(`Invalid slug input: "${raw}"`);
    }

    return new Slug(normalized);
  }

  public toString(): string {
    return this.value;
  }

  public equals(other: Slug): boolean {
    return this.value === other.value;
  }
}
