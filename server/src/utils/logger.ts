/* eslint-disable no-console */
const ts = () => new Date().toISOString();
export const logger = {
  info: (...a: any[]) => console.log(`[${ts()}] [INFO]`, ...a),
  warn: (...a: any[]) => console.warn(`[${ts()}] [WARN]`, ...a),
  error: (...a: any[]) => console.error(`[${ts()}] [ERR ]`, ...a),
};
