// tests/calculator.spec.js
import { describe, it, expect } from 'vitest';
import { calculateReadiness, volumeSubscore, clamp, validateInput } from '../app.js';

describe('Automation Readiness Calculator', () => {
  describe('clamp', () => {
    it('should clamp values within range', () => {
      expect(clamp(50, 0, 100)).toBe(50);
      expect(clamp(-10, 0, 100)).toBe(0);
      expect(clamp(150, 0, 100)).toBe(100);
    });
  });

  describe('volumeSubscore', () => {
    it('should return 0 for zero volume', () => {
      expect(volumeSubscore(0)).toBe(0);
    });

    it('should return scaled score for positive volumes', () => {
      expect(volumeSubscore(100)).toBeCloseTo(63, 0);
      expect(volumeSubscore(1000)).toBeCloseTo(94.5, 0);
      expect(volumeSubscore(10000)).toBe(95);
    });

    it('should cap at 95', () => {
      expect(volumeSubscore(100000)).toBe(95);
      expect(volumeSubscore(1000000)).toBe(95);
    });
  });

  describe('validateInput', () => {
    it('should validate variance within 0-100', () => {
      expect(validateInput('variance', 50).valid).toBe(true);
      expect(validateInput('variance', -10).valid).toBe(false);
      expect(validateInput('variance', 150).valid).toBe(false);
    });

    it('should validate processVolume >= 0', () => {
      expect(validateInput('processVolume', 1000).valid).toBe(true);
      expect(validateInput('processVolume', 0).valid).toBe(true);
      expect(validateInput('processVolume', -100).valid).toBe(false);
    });

    it('should reject NaN values', () => {
      expect(validateInput('variance', NaN).valid).toBe(false);
    });
  });

  describe('calculateReadiness', () => {
    it('should calculate Green band for ideal inputs', () => {
      const inputs = {
        processVolume: 5000,
        variance: 10,
        exceptionRate: 5,
        dataQuality: 95,
        systemAccess: 90,
        complianceSensitivity: 10,
      };

      const result = calculateReadiness(inputs);
      expect(result.readinessScore).toBeGreaterThanOrEqual(75);
      expect(result.band).toBe('Green');
      expect(result.topBlockers.length).toBeLessThanOrEqual(4);
    });

    it('should calculate Red band for poor inputs', () => {
      const inputs = {
        processVolume: 50,
        variance: 80,
        exceptionRate: 70,
        dataQuality: 30,
        systemAccess: 20,
        complianceSensitivity: 90,
      };

      const result = calculateReadiness(inputs);
      expect(result.readinessScore).toBeLessThan(50);
      expect(result.band).toBe('Red');
      expect(result.topBlockers.length).toBeGreaterThan(0);
    });

    it('should calculate Yellow band for moderate inputs', () => {
      const inputs = {
        processVolume: 1000,
        variance: 40,
        exceptionRate: 30,
        dataQuality: 60,
        systemAccess: 50,
        complianceSensitivity: 40,
      };

      const result = calculateReadiness(inputs);
      expect(result.readinessScore).toBeGreaterThanOrEqual(50);
      expect(result.readinessScore).toBeLessThan(75);
      expect(result.band).toBe('Yellow');
    });

    it('should identify top blockers correctly', () => {
      const inputs = {
        processVolume: 1000,
        variance: 90, // High variance = big blocker
        exceptionRate: 10,
        dataQuality: 70,
        systemAccess: 60,
        complianceSensitivity: 30,
      };

      const result = calculateReadiness(inputs);
      expect(result.topBlockers.length).toBeGreaterThan(0);
      expect(result.topBlockers[0].factor).toBe('stableProcess');
      expect(result.topBlockers[0].reason).toBe('High Process Variance');
    });

    it('should filter out small gaps from blockers', () => {
      const inputs = {
        processVolume: 5000,
        variance: 5,
        exceptionRate: 5,
        dataQuality: 90,
        systemAccess: 88,
        complianceSensitivity: 8,
      };

      const result = calculateReadiness(inputs);
      // All gaps should be < 15, so no blockers shown
      expect(result.topBlockers.length).toBe(0);
    });

    it('should handle default inputs correctly', () => {
      const inputs = {
        processVolume: 1000,
        variance: 20,
        exceptionRate: 10,
        dataQuality: 70,
        systemAccess: 60,
        complianceSensitivity: 30,
      };

      const result = calculateReadiness(inputs);
      expect(result.readinessScore).toBeGreaterThan(0);
      expect(result.readinessScore).toBeLessThanOrEqual(100);
      expect(['Red', 'Yellow', 'Green']).toContain(result.band);
      expect(result.narrative).toBeTruthy();
    });
  });
});