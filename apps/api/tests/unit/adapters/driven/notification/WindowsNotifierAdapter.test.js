const { buildToastScript } = require('../../../../../src/adapters/driven/notification/WindowsNotifierAdapter');

describe('buildToastScript', () => {
  it('embeds the message text into the script', () => {
    expect(buildToastScript('Port 8080 freed')).toContain('Port 8080 freed');
  });

  it('escapes single quotes so a message cannot break out of the PowerShell string literal', () => {
    const script = buildToastScript("it's protected");

    expect(script).toContain("it''s protected");
    expect(script).not.toContain("it's protected");
  });

  it('always targets the ToastNotificationManager APIs', () => {
    expect(buildToastScript('anything')).toContain('Windows.UI.Notifications.ToastNotificationManager');
  });
});
