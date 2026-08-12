import { z } from 'zod';

/**
 * Coolify resource identifier.
 * Coolify uses UUID v4 for most resources but also generates base36-like identifiers.
 * This schema accepts any alphanumeric string (1-128 chars) with dashes and underscores.
 */
export const coolifyResourceIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/, 'Resource ID must be alphanumeric with dashes/underscores only');
