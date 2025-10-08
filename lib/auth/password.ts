/**
 * 密码哈希和验证工具
 * 使用 bcryptjs
 */

import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export const passwordUtils = {
  /**
   * 生成密码哈希
   */
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  },

  /**
   * 验证密码
   */
  async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  },

  /**
   * 同步版本 - 生成密码哈希（用于种子数据）
   */
  hashSync(password: string): string {
    return bcrypt.hashSync(password, SALT_ROUNDS);
  },

  /**
   * 同步版本 - 验证密码
   */
  verifySync(password: string, hash: string): boolean {
    return bcrypt.compareSync(password, hash);
  },
};
