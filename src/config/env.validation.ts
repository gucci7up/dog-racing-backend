import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(3000),

  DATABASE_URL: Joi.string().uri().required(),
  REDIS_URL: Joi.string().uri().required(),

  PUBLIC_BASE_URL: Joi.string().uri().optional(),

  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('1d'),

  BCRYPT_SALT_ROUNDS: Joi.number().integer().min(8).max(15).default(10),
}).unknown(true);
