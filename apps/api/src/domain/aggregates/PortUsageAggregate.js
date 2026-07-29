const { PortUsage } = require('../entities/PortUsage');

class PortUsageAggregate {
  #usages;

  constructor(usages = []) {
    this.#usages = [];
    usages.forEach((usage) => this.add(usage));
  }

  add(usage) {
    if (!(usage instanceof PortUsage)) {
      throw new Error('PortUsageAggregate only accepts PortUsage instances.');
    }
    if (this.findById(usage.id)) {
      throw new Error(`Duplicate port usage: ${usage.id} is already tracked.`);
    }

    this.#usages.push(usage);
  }

  remove(id) {
    const index = this.#usages.findIndex((usage) => usage.id === id);
    if (index === -1) {
      throw new Error(`Cannot remove: no port usage found with id ${id}.`);
    }

    this.#usages.splice(index, 1);
  }

  findById(id) {
    return this.#usages.find((usage) => usage.id === id) ?? null;
  }

  list() {
    return [...this.#usages];
  }

  get size() {
    return this.#usages.length;
  }
}

module.exports = { PortUsageAggregate };
