import { Response } from 'express';
import { successResponse } from '../utils/response.js';

export abstract class BaseController {
  /**
   * Send a successful response
   */
  protected success(res: Response, data: unknown, statusCode = 200) {
    return successResponse(res, data, statusCode);
  }
}
