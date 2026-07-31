import { showPromptModal } from '../../src/ui/promptModal.js';

function buildElements() {
  return {
    overlay: document.createElement('div'),
    messageEl: document.createElement('div'),
    inputEl: document.createElement('input'),
    okButton: document.createElement('button'),
    cancelButton: document.createElement('button'),
  };
}

describe('showPromptModal', () => {
  it('shows the overlay with the message and default value', () => {
    const elements = buildElements();
    elements.overlay.hidden = true;

    showPromptModal(elements, 'Digite algo:', 'valor inicial');

    expect(elements.overlay.hidden).toBe(false);
    expect(elements.messageEl.textContent).toBe('Digite algo:');
    expect(elements.inputEl.value).toBe('valor inicial');
  });

  it('resolves with the input value and hides the overlay when OK is clicked', async () => {
    const elements = buildElements();
    const promise = showPromptModal(elements, 'Digite algo:', '');

    elements.inputEl.value = 'novo valor';
    elements.okButton.click();

    await expect(promise).resolves.toBe('novo valor');
    expect(elements.overlay.hidden).toBe(true);
  });

  it('resolves with null and hides the overlay when Cancelar is clicked', async () => {
    const elements = buildElements();
    const promise = showPromptModal(elements, 'Digite algo:', 'valor');

    elements.cancelButton.click();

    await expect(promise).resolves.toBeNull();
    expect(elements.overlay.hidden).toBe(true);
  });

  it('resolves with the input value on Enter', async () => {
    const elements = buildElements();
    const promise = showPromptModal(elements, 'Digite algo:', '');

    elements.inputEl.value = 'via enter';
    elements.inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    await expect(promise).resolves.toBe('via enter');
  });

  it('resolves with null on Escape', async () => {
    const elements = buildElements();
    const promise = showPromptModal(elements, 'Digite algo:', 'valor');

    elements.inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    await expect(promise).resolves.toBeNull();
  });

  it('does not resolve again if OK is clicked twice (listeners are cleaned up)', async () => {
    const elements = buildElements();
    const promise = showPromptModal(elements, 'Digite algo:', '');

    elements.inputEl.value = 'primeiro';
    elements.okButton.click();
    elements.inputEl.value = 'segundo';
    elements.okButton.click();

    await expect(promise).resolves.toBe('primeiro');
  });
});
