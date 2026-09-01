export class BaseDao {
  protected normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }
}
