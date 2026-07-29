const { Tray, Menu, nativeImage, app } = require('electron');

// Placeholder icon: a solid 16x16 square built as a raw BGRA buffer, so we
// don't need a real .ico asset yet. Swap for a real icon file before
// shipping (nativeImage.createFromPath(...)).
function createPlaceholderIcon() {
  const size = 16;
  const buffer = Buffer.alloc(size * size * 4);

  for (let i = 0; i < size * size; i += 1) {
    buffer[i * 4] = 0x2a; // B
    buffer[i * 4 + 1] = 0x6f; // G
    buffer[i * 4 + 2] = 0xdc; // R
    buffer[i * 4 + 3] = 0xff; // A
  }

  return nativeImage.createFromBuffer(buffer, { width: size, height: size });
}

function createTray(mainWindow, { onQuit }) {
  const tray = new Tray(createPlaceholderIcon());
  tray.setToolTip('Port Manager');

  const toggleWindow = () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  };

  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Show/Hide Port Manager', click: toggleWindow },
      { type: 'separator' },
      { label: 'Quit', click: onQuit ?? (() => app.quit()) },
    ])
  );

  tray.on('click', toggleWindow);

  return tray;
}

module.exports = { createTray, createPlaceholderIcon };
