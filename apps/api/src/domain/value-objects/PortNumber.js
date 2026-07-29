class PortNumber {
  #value;

  constructor(value) {
    if (!Number.isInteger(value) || value < 1 || value > 65535) {
      throw new Error(`Invalid port number: ${value}. Must be an integer between 1 and 65535.`);
    }

    this.#value = value;
    Object.freeze(this);
  }

  get value() {
    return this.#value;
  }

  equals(other) {
    return other instanceof PortNumber && other.value === this.value;
  }

  toString() {
    return String(this.#value);
  }
}

module.exports = { PortNumber };
