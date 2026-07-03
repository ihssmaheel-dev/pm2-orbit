import { describe, it, expect } from 'vitest';
import { CircularBuffer, BufferStore } from '../core/pm2/buffer';

describe('CircularBuffer', () => {
  it('should push and read values', () => {
    const buf = new CircularBuffer(10);
    buf.push(1000, 50.5, 1024000);
    
    const data = buf.read();
    expect(data.ts).toHaveLength(1);
    expect(data.ts[0]).toBe(1000);
    expect(data.cpu[0]).toBe(50.5);
    expect(data.memory[0]).toBe(1024000);
  });

  it('should wrap around correctly', () => {
    const buf = new CircularBuffer(3);
    buf.push(1, 10, 100);
    buf.push(2, 20, 200);
    buf.push(3, 30, 300);
    buf.push(4, 40, 400); // Should wrap

    const data = buf.read();
    expect(data.ts).toEqual([2, 3, 4]);
    expect(data.cpu).toEqual([20, 30, 40]);
    expect(data.memory).toEqual([200, 300, 400]);
  });

  it('should return empty when no data', () => {
    const buf = new CircularBuffer(10);
    const data = buf.read();
    expect(data.ts).toHaveLength(0);
  });

  it('should track length correctly', () => {
    const buf = new CircularBuffer(5);
    expect(buf.length).toBe(0);
    
    buf.push(1, 10, 100);
    expect(buf.length).toBe(1);
    
    buf.push(2, 20, 200);
    expect(buf.length).toBe(2);
  });
});

describe('BufferStore', () => {
  it('should create and retrieve buffers', () => {
    const store = new BufferStore();
    store.push(1, 1000, 50.5, 1024000);
    
    const data = store.read(1);
    expect(data.ts).toHaveLength(1);
    expect(data.ts[0]).toBe(1000);
  });

  it('should remove process buffers', () => {
    const store = new BufferStore();
    store.push(1, 1000, 50.5, 1024000);
    store.remove(1);
    
    const data = store.read(1);
    expect(data.ts).toHaveLength(0);
  });

  it('should handle multiple processes', () => {
    const store = new BufferStore();
    store.push(1, 1000, 50, 1000);
    store.push(2, 2000, 60, 2000);
    
    const data1 = store.read(1);
    const data2 = store.read(2);
    
    expect(data1.ts[0]).toBe(1000);
    expect(data2.ts[0]).toBe(2000);
  });
});
