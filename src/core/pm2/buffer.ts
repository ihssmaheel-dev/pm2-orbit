const BUFFER_SIZE = 120;

export class CircularBuffer {
  ts: Float64Array;
  cpu: Float32Array;
  memory: Float32Array;
  private ptr = 0;
  private count = 0;

  constructor(size = BUFFER_SIZE) {
    this.ts = new Float64Array(size);
    this.cpu = new Float32Array(size);
    this.memory = new Float32Array(size);
  }

  push(ts: number, cpu: number, mem: number): void {
    this.ts[this.ptr] = ts;
    this.cpu[this.ptr] = cpu;
    this.memory[this.ptr] = mem;
    this.ptr = (this.ptr + 1) % this.ts.length;
    if (this.count < this.ts.length) this.count++;
  }

  read(): { ts: number[]; cpu: number[]; memory: number[] } {
    if (this.count === 0) {
      return { ts: [], cpu: [], memory: [] };
    }

    const start = this.count < this.ts.length ? 0 : this.ptr;
    const tsArr: number[] = [];
    const cpuArr: number[] = [];
    const memArr: number[] = [];

    for (let i = 0; i < this.count; i++) {
      const idx = (start + i) % this.ts.length;
      tsArr.push(this.ts[idx]);
      cpuArr.push(this.cpu[idx]);
      memArr.push(this.memory[idx]);
    }

    return { ts: tsArr, cpu: cpuArr, memory: memArr };
  }

  get length(): number {
    return this.count;
  }
}

export class BufferStore {
  private buffers = new Map<number, CircularBuffer>();

  getOrCreate(processId: number): CircularBuffer {
    let buf = this.buffers.get(processId);
    if (!buf) {
      buf = new CircularBuffer();
      this.buffers.set(processId, buf);
    }
    return buf;
  }

  push(processId: number, ts: number, cpu: number, mem: number): void {
    this.getOrCreate(processId).push(ts, cpu, mem);
  }

  read(processId: number): { ts: number[]; cpu: number[]; memory: number[] } {
    return this.getOrCreate(processId).read();
  }

  remove(processId: number): void {
    this.buffers.delete(processId);
  }

  getAll(): Map<number, CircularBuffer> {
    return this.buffers;
  }
}
