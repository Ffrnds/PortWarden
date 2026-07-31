const VALID_PROTOCOLS = Object.freeze(['TCP', 'UDP']);

class Protocol {
  #value;

  constructor(value) {
    const normalized = typeof value === 'string' ? value.toUpperCase() : value;

    if (!VALID_PROTOCOLS.includes(normalized)) {
      throw new Error(`Invalid protocol: ${value}. Must be one of: ${VALID_PROTOCOLS.join(', ')}.`);
    }

    this.#value = normalized;
    Object.freeze(this);
  }

  get value() {
    return this.#value;
  }

  equals(other) {
    return other instanceof Protocol && other.value === this.value;
  }

  toString() {
    return this.#value;
  }
}

module.exports = { Protocol };
