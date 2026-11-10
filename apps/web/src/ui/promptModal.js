// Electron's BrowserWindow does not reliably show window.prompt() — unlike
// alert()/confirm(), it's a known gap (nothing renders, the call just hangs
// or resolves to nothing depending on the Electron version). This is a real
// in-page modal instead, so it actually works in the packaged desktop app,
// not just in a regular browser tab.
export function showPromptModal({ overlay, messageEl, inputEl, okButton, cancelButton }, message, defaultValue = '') {
  return new Promise((resolve) => {
    messageEl.textContent = message;
    inputEl.value = defaultValue;
    overlay.hidden = false;
    inputEl.focus();
    inputEl.select();

    function cleanup(result) {
      overlay.hidden = true;
      okButton.removeEventListener('click', onOk);
      cancelButton.removeEventListener('click', onCancel);
      inputEl.removeEventListener('keydown', onKeydown);
      resolve(result);
    }

    function onOk() {
      cleanup(inputEl.value);
    }

    function onCancel() {
      cleanup(null);
    }

    function onKeydown(event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        onOk();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    }

    okButton.addEventListener('click', onOk);
    cancelButton.addEventListener('click', onCancel);
    inputEl.addEventListener('keydown', onKeydown);
  });
}
