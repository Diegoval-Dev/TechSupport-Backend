import { Request, Response } from 'express';
import multer from 'multer';
import { FileProcessingService } from '../../../application/services/FileProcessingService';

interface StatusParams {
  processId: string;
}

const upload = multer({
  limits: { fileSize: 20 * 1024 * 1024 },
});

const service = new FileProcessingService();

export class FileController {
  static uploadMiddleware = upload.single('file');

  static async upload(req: Request, res: Response) {
    if (!req.file) {
      return res.status(400).json({ message: 'File required' });
    }

    const result = await service.processFile(req.file.buffer);
    res.status(202).json(result);
  }

  static async status(req: Request<StatusParams>, res: Response) {
    try {
      const result = await service.getStatus(req.params.processId);
      
      if (!result) {
        return res.status(404).json({ message: 'Process not found' });
      }
      
      res.json(result);
    } catch (error) {
      return res.status(500).json({
        message: 'Error retrieving process status',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
