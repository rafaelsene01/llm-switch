export { };

declare global {
  namespace Express {
    interface Request {
      clientLabel: string;
      userModel: string | null;
      tokenPreview: string;
      user: {
        id: string;
        name: string;
        model: string | null;
        allowedModels: string[];
        sanitizationRoles: import('./index').SanitizationRoles;
      } | null;
    }
  }
}
