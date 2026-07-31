const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { NotifierPort } = require('../../../domain/ports/outbound/NotifierPort');

const execFileAsync = promisify(execFile);

/**
 * Builds the PowerShell script that shows a native Windows toast. Exported
 * and kept pure (just string building) so escaping can be unit tested
 * without ever actually popping a notification on screen.
 */
function buildToastScript(message) {
  const escapedMessage = String(message).replace(/'/g, "''");

  return [
    "[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType=WindowsRuntime] | Out-Null;",
    "[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom, ContentType=WindowsRuntime] | Out-Null;",
    "$template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText01);",
    `$text = $template.GetElementsByTagName('text'); $text.Item(0).AppendChild($template.CreateTextNode('${escapedMessage}')) | Out-Null;`,
    '$toast = [Windows.UI.Notifications.ToastNotification]::new($template);',
    "[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Port Manager').Show($toast);",
  ].join(' ');
}

class WindowsNotifierAdapter extends NotifierPort {
  async notify(message) {
    await execFileAsync('powershell', ['-NoProfile', '-NonInteractive', '-Command', buildToastScript(message)]);
  }
}

module.exports = { WindowsNotifierAdapter, buildToastScript };
