import { describe, it, expect } from 'vitest';
import { sanitizeFileName, parseIdParam, validateAlertRule } from '../utils/validate';

describe('sanitizeFileName', () => {
  it('should strip path traversal', () => {
    expect(sanitizeFileName('../../etc/passwd')).toBe('etc_passwd');
  });

  it('should replace slashes with underscores', () => {
    expect(sanitizeFileName('my/process/name')).toBe('my_process_name');
  });

  it('should remove null bytes', () => {
    expect(sanitizeFileName('test\0file')).toBe('testfile');
  });

  it('should replace spaces with underscores', () => {
    expect(sanitizeFileName('my process name')).toBe('my_process_name');
  });

  it('should trim leading/trailing underscores', () => {
    expect(sanitizeFileName('_test_')).toBe('test');
  });

  it('should truncate to 128 chars', () => {
    const long = 'a'.repeat(200);
    expect(sanitizeFileName(long)).toHaveLength(128);
  });
});

describe('parseIdParam', () => {
  it('should return number for valid input', () => {
    expect(parseIdParam('123')).toBe(123);
    expect(parseIdParam('0')).toBe(0);
  });

  it('should return null for invalid input', () => {
    expect(parseIdParam('')).toBeNull();
    expect(parseIdParam('abc')).toBeNull();
    expect(parseIdParam('-1')).toBeNull();
    expect(parseIdParam('NaN')).toBeNull();
  });
});

describe('validateAlertRule', () => {
  it('should return rule for valid input', () => {
    const body = {
      id: 'rule-1',
      scope: 'process',
      metric: 'cpu',
      operator: '>',
      threshold: 80,
      severity: 'warning',
      channels: ['browser'],
    };

    const result = validateAlertRule(body);
    expect(result).not.toBeNull();
    expect(result?.id).toBe('rule-1');
    expect(result?.metric).toBe('cpu');
  });

  it('should return null for missing fields', () => {
    expect(validateAlertRule({})).toBeNull();
    expect(validateAlertRule({ id: 'rule-1' })).toBeNull();
    expect(validateAlertRule({ id: 'rule-1', metric: 'cpu' })).toBeNull();
  });

  it('should return null for invalid metric', () => {
    const body = {
      id: 'rule-1',
      metric: 'invalid',
      operator: '>',
      threshold: 80,
    };
    expect(validateAlertRule(body)).toBeNull();
  });

  it('should handle system metrics', () => {
    const body = {
      id: 'rule-1',
      scope: 'system',
      metric: 'systemCpu',
      operator: '>',
      threshold: 50,
      severity: 'critical',
      channels: ['slack'],
    };

    const result = validateAlertRule(body);
    expect(result).not.toBeNull();
    expect(result?.metric).toBe('systemCpu');
    expect(result?.severity).toBe('critical');
  });
});
