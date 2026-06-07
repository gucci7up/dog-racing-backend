export type AppConfig = {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  databaseUrl: string;
  redisUrl: string;
  publicBaseUrl?: string;
  videosPath?: string;
  resultsCsvPath?: string;
  jwt: {
    secret: string;
    expiresIn: string;
  };
  bcryptSaltRounds: number;
};

export default (): AppConfig => ({
  nodeEnv: (process.env.NODE_ENV as AppConfig['nodeEnv']) ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL ?? '',
  redisUrl: process.env.REDIS_URL ?? '',
  publicBaseUrl: process.env.PUBLIC_BASE_URL,
  videosPath: process.env.VIDEOS_PATH,
  resultsCsvPath: process.env.RESULTS_CSV_PATH,
  jwt: {
    secret: process.env.JWT_SECRET ?? '',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  },
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS ?? 10),
});
