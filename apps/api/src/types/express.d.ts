export { };

declare global {
  namespace Express {
    interface Request {
      clientLabel: string;
      userModel: string | null;
      user: {
        id: string;
        name: string;
        model: string | null;
        allowedModels: string[];
      } | null;
    }
  }
}
