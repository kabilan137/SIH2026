import crypto from 'node:crypto';

export function requestLogger(req, res, next) {
  const startedAt = Date.now();
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('x-request-id', req.id);

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    console.info(
      JSON.stringify({
        requestId: req.id,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs
      })
    );
  });

  next();
}
