// The source of randomness is injectable — same reasoning as injecting a
// fixed Date into ProcessTerminatedEvent on the API side: it's what makes
// generateTwinkleSpecs testable with an exact, predictable output instead of
// asserting vague things like "some spec exists".
export function generateTwinkleSpecs(count, random = Math.random) {
  const specs = [];

  for (let i = 0; i < count; i += 1) {
    specs.push({
      top: Number((random() * 100).toFixed(1)),
      left: Number((random() * 100).toFixed(1)),
      size: Number((random() * 1.6 + 1).toFixed(1)),
      duration: Number((random() * 2.5 + 2.2).toFixed(1)),
      delay: Number((random() * 5).toFixed(1)),
    });
  }

  return specs;
}

export function renderTwinkleField(fieldElement, specs, reduceMotion) {
  fieldElement.innerHTML = specs
    .map((spec) => {
      const style =
        `top:${spec.top}%; left:${spec.left}%; width:${spec.size}px; height:${spec.size}px;` +
        (reduceMotion ? 'opacity:.6;' : `animation-duration:${spec.duration}s; animation-delay:${spec.delay}s;`);
      return `<span class="widget-twinkle" style="${style}"></span>`;
    })
    .join('');
}
