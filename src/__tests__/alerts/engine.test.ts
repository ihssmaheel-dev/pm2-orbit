import { describe, it, expect, beforeEach } from 'vitest';
import { createAlertEngine, type AlertRule, type AlertEvent } from '../../core/alerts/engine';

describe('AlertEngine', () => {
  let engine: ReturnType<typeof createAlertEngine>;

  beforeEach(() => {
    engine = createAlertEngine();
    engine.clearRules();
  });

  describe('addRule / removeRule', () => {
    it('should add and retrieve a rule', () => {
      const rule: AlertRule = {
        id: 'test-1',
        scope: 'process',
        metric: 'cpu',
        operator: '>',
        threshold: 80,
        severity: 'warning',
        enabled: true,
        channels: ['browser'],
      };

      engine.addRule(rule);
      const rules = engine.getRules();
      expect(rules).toHaveLength(1);
      expect(rules[0].id).toBe('test-1');
    });

    it('should remove a rule', () => {
      const rule: AlertRule = {
        id: 'test-1',
        scope: 'process',
        metric: 'cpu',
        operator: '>',
        threshold: 80,
        severity: 'warning',
        enabled: true,
        channels: ['browser'],
      };

      engine.addRule(rule);
      engine.removeRule('test-1');
      expect(engine.getRules()).toHaveLength(0);
    });
  });

  describe('evaluate', () => {
    it('should fire when threshold exceeded', () => {
      const rule: AlertRule = {
        id: 'test-1',
        scope: 'process',
        metric: 'cpu',
        operator: '>',
        threshold: 80,
        severity: 'warning',
        enabled: true,
        channels: ['browser'],
      };

      engine.addRule(rule);
      const fired = engine.evaluate(0, 'test-process', { cpu: 90 });
      expect(fired).toHaveLength(1);
      expect(fired[0].metric).toBe('cpu');
      expect(fired[0].value).toBe(90);
    });

    it('should not fire when threshold not exceeded', () => {
      const rule: AlertRule = {
        id: 'test-1',
        scope: 'process',
        metric: 'cpu',
        operator: '>',
        threshold: 80,
        severity: 'warning',
        enabled: true,
        channels: ['browser'],
      };

      engine.addRule(rule);
      const fired = engine.evaluate(0, 'test-process', { cpu: 70 });
      expect(fired).toHaveLength(0);
    });

    it('should respect cooldown', () => {
      const rule: AlertRule = {
        id: 'test-1',
        scope: 'process',
        metric: 'cpu',
        operator: '>',
        threshold: 80,
        severity: 'warning',
        enabled: true,
        channels: ['browser'],
      };

      engine.addRule(rule);
      
      // First fire should work
      const fired1 = engine.evaluate(0, 'test-process', { cpu: 90 });
      expect(fired1).toHaveLength(1);
      
      // Second fire immediately should be blocked by cooldown
      const fired2 = engine.evaluate(0, 'test-process', { cpu: 95 });
      expect(fired2).toHaveLength(0);
    });

    it('should skip disabled rules', () => {
      const rule: AlertRule = {
        id: 'test-1',
        scope: 'process',
        metric: 'cpu',
        operator: '>',
        threshold: 80,
        severity: 'warning',
        enabled: false,
        channels: ['browser'],
      };

      engine.addRule(rule);
      const fired = engine.evaluate(0, 'test-process', { cpu: 90 });
      expect(fired).toHaveLength(0);
    });
  });

  describe('evaluateSystem', () => {
    it('should fire system-level alerts', () => {
      const rule: AlertRule = {
        id: 'sys-1',
        scope: 'system',
        metric: 'systemCpu',
        operator: '>',
        threshold: 50,
        severity: 'warning',
        enabled: true,
        channels: ['browser'],
      };

      engine.addRule(rule);
      const fired = engine.evaluateSystem({ systemCpu: 75 });
      expect(fired).toHaveLength(1);
      expect(fired[0].processName).toBe('System');
    });

    it('should not fire system alerts below threshold', () => {
      const rule: AlertRule = {
        id: 'sys-1',
        scope: 'system',
        metric: 'systemCpu',
        operator: '>',
        threshold: 80,
        severity: 'warning',
        enabled: true,
        channels: ['browser'],
      };

      engine.addRule(rule);
      const fired = engine.evaluateSystem({ systemCpu: 50 });
      expect(fired).toHaveLength(0);
    });
  });

  describe('getHistory', () => {
    it('should track fired alerts in history', () => {
      const rule: AlertRule = {
        id: 'test-1',
        scope: 'process',
        metric: 'cpu',
        operator: '>',
        threshold: 80,
        severity: 'warning',
        enabled: true,
        channels: ['browser'],
      };

      engine.addRule(rule);
      engine.evaluate(0, 'test-process', { cpu: 90 });
      
      const history = engine.getHistory();
      expect(history.events).toHaveLength(1);
      expect(history.events[0].message).toContain('cpu > 80');
    });
  });
});
