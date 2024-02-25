import pino from 'pino';

export const loggerInstance = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

/* eslint-disable @typescript-eslint/no-explicit-any */
export const createModuleLogger = (packageName: string) => ({
  ...loggerInstance,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  info: (msg: string, obj?: object, ...args: any[]) => {
    loggerInstance.info(obj, `[${packageName}]: ${msg}`, args);
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  warn: (msg: string, obj?: object, ...args: any[]) => {
    loggerInstance.warn(obj, `[${packageName}]: ${msg}`, args);
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: (msg: string, obj?: object, ...args: any[]) => {
    loggerInstance.error(obj, `[${packageName}]: ${msg}`, args);
  },
});

export default createModuleLogger;
