import { generateTwinkleSpecs, renderTwinkleField } from '../../src/ui/twinkleField.js';

describe('generateTwinkleSpecs', () => {
  it('generates the requested number of specs', () => {
    expect(generateTwinkleSpecs(5, () => 0.5)).toHaveLength(5);
  });

  it('is deterministic given a fixed random source', () => {
    const specs = generateTwinkleSpecs(1, () => 0.5);

    expect(specs[0]).toEqual({ top: 50, left: 50, size: 1.8, duration: 3.5, delay: 2.5 });
  });
});

describe('renderTwinkleField', () => {
  it('renders one span per spec with position and size', () => {
    const field = document.createElement('div');

    renderTwinkleField(field, [{ top: 10, left: 20, size: 1.5, duration: 3, delay: 1 }], false);

    const span = field.querySelector('.widget-twinkle');
    expect(span).not.toBeNull();
    expect(span.style.top).toBe('10%');
    expect(span.style.left).toBe('20%');
  });

  it('uses a static opacity instead of animation when reduced motion is requested', () => {
    const field = document.createElement('div');

    renderTwinkleField(field, [{ top: 10, left: 20, size: 1.5, duration: 3, delay: 1 }], true);

    const span = field.querySelector('.widget-twinkle');
    expect(span.style.opacity).toBe('0.6');
    expect(span.style.animationDuration).toBe('');
  });
});
