export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    Object.assign(this, extra);
  }
}
export const badRequest = (msg, fields) => new HttpError(400, msg, { fields });
export const unauthorized = (msg = 'Sign in to continue.') => new HttpError(401, msg);
export const forbidden = (msg = 'You do not have access to this resource.') => new HttpError(403, msg);
export const notFound = (msg = 'Not found.') => new HttpError(404, msg);
export const conflict = (msg, extra) => new HttpError(409, msg, extra);
export const tooMany = (msg) => new HttpError(429, msg);
