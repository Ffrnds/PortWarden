class ProcessId {
  #value;

  constructor(value) {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`Invalid process id: ${value}. Must be a non-negative integer.`);
    }

    this.#value = value;
    Object.freeze(this);
  }

  get value() {
    return this.#value;
  }

  equals(other) {
    return other instanceof ProcessId && other.value === this.value;
  }

  toString() {
    return String(this.#value);
  }
}

module.exports = { ProcessId };
