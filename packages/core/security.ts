export interface IdentityProvider {
  authenticate(username: string, password: string): boolean;
}

export class DefaultIdentityProvider implements IdentityProvider {
  authenticate(username: string, password: string): boolean {
    const adminUser = process.env.ADMIN_USERNAME;
    const adminPass = process.env.ADMIN_PASSWORD;
    if (!adminUser || !adminPass) {
      throw new Error("Missing required administrative credentials. Please define ADMIN_USERNAME and ADMIN_PASSWORD environment variables.");
    }
    return username === adminUser && password === adminPass;
  }
}

export class SecuritySystem {
  private static identityProvider: IdentityProvider = new DefaultIdentityProvider();

  static setIdentityProvider(provider: IdentityProvider) {
    this.identityProvider = provider;
  }

  static authenticate(user: string, pass: string): boolean {
    return this.identityProvider.authenticate(user, pass);
  }
}
