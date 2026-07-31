const { Tray, Menu, nativeImage, app } = require('electron');

// Placeholder icon: a solid 16x16 square built as a raw BGRA buffer, so we
// don't need a real .ico asset yet. Matches the PortPulse brand cyan
// (#35f2ff). Swap for a real icon file (rasterized from assets/logo.svg)
// before shipping.
function createPlaceholderIcon() {
  const size = 16;
  const buffer = Buffer.alloc(size * size * 4);

  for (let i = 0; i < size * size; i += 1) {
    buffer[i * 4] = 0xff; // B
    buffer[i * 4 + 1] = 0xf2; // G
    buffer[i * 4 + 2] = 0x35; // R
    buffer[i * 4 + 3] = 0xff; // A
  }

  return nativeImage.createFromBuffer(buffer, { width: size, height: size });
}

function createTray(mainWindow, { onQuit, iconPath } = {}) {
  const icon = iconPath ? nativeImage.createFromPath(iconPath) : createPlaceholderIcon();
  const tray = new Tray(icon.isEmpty() ? createPlaceholderIcon() : icon);
  tray.setToolTip('PortPulse');

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
      { label: 'Mostrar/Ocultar PortPulse', click: toggleWindow },
      { type: 'separator' },
      { label: 'Sair', click: onQuit ?? (() => app.quit()) },
    ])
  );

  tray.on('click', toggleWindow);

  return tray;
}

module.exports = { createTray, createPlaceholderIcon };
