import type { Role } from '../types';

export function hasRole(role: Role | undefined, ...allowed: Role[]): boolean {
  return !!role && allowed.includes(role);
}
