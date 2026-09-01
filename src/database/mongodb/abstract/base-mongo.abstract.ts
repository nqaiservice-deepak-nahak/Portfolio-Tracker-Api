export abstract class BaseMongoAbstract<T> {
  abstract findByIdForUser(id: string, userId: string): Promise<T | null>;
}
