export const isProd = process.env.NODE_ENV === 'production';
export const isLocal = process.env.NODE_ENV === 'development';

export const showLogger = isLocal || process.env.NEXT_PUBLIC_SHOW_LOGGER === 'true';
