import type { Request, Response } from 'express';
import { embedMany } from 'ai';
import { resolveEmbedder } from '../providers';

export async function createEmbeddings(req: Request, res: Response): Promise<void> {
  const { model, input, encoding_format = 'float' } = req.body as {
    model?: string;
    input?: string | string[];
    encoding_format?: string;
  };

  const providerModel = model || req.userModel;

  if (!providerModel) {
    res.status(400).json({
      error: {
        message: 'Nenhum modelo configurado. Informe o modelo na requisição ou atribua um ao usuário.',
        type: 'invalid_request_error',
        code: 'model_required',
      },
    });
    return;
  }

  if (!input || (Array.isArray(input) && input.length === 0)) {
    res.status(400).json({
      error: {
        message: "O campo 'input' é obrigatório.",
        type: 'invalid_request_error',
        code: 'input_required',
      },
    });
    return;
  }

  let embedder;
  try {
    embedder = resolveEmbedder(providerModel);
  } catch (err) {
    res.status(400).json({
      error: {
        message: (err as Error).message,
        type: 'invalid_request_error',
        code: 'unsupported_model',
      },
    });
    return;
  }

  const values = Array.isArray(input) ? input : [input];

  let result;
  try {
    result = await embedMany({ model: embedder, values });
  } catch (err) {
    res.status(502).json({
      error: {
        message: `Erro ao gerar embeddings com "${providerModel}": ${(err as Error).message}`,
        type: 'provider_error',
      },
    });
    return;
  }

  const data = result.embeddings.map((embedding, index) => {
    if (encoding_format === 'base64') {
      const buf = Buffer.allocUnsafe(embedding.length * 4);
      for (let i = 0; i < embedding.length; i++) buf.writeFloatLE(embedding[i], i * 4);
      return { object: 'embedding', embedding: buf.toString('base64'), index };
    }
    return { object: 'embedding', embedding, index };
  });

  res.json({
    object: 'list',
    data,
    model: providerModel,
    usage: {
      prompt_tokens: result.usage?.tokens ?? 0,
      total_tokens: result.usage?.tokens ?? 0,
    },
  });
}
