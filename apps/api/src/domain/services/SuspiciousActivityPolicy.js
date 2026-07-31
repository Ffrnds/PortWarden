// Static list of ports with a long history of being the default for
// malware/backdoor tooling (Back Orifice, NetBus, Metasploit's default
// handler, classic IRC-based botnet C2, etc.) or of carrying inherently
// insecure protocols (Telnet). This is basic pattern matching against a
// fixed list, not a live threat-intelligence feed — it exists to catch
// obviously-worth-a-look activity, not to be a real security product.
const SUSPICIOUS_PORTS = new Map([
  [23, 'Telnet — sends credentials in cleartext, rarely legitimate on a dev machine'],
  [1337, '"leet" — commonly used by backdoors and CTF/pentest tooling'],
  [4444, "Metasploit's default handler port"],
  [5554, 'Default backdoor port opened by the Sasser worm'],
  [6667, 'IRC — historically used as botnet command-and-control'],
  [9999, 'Common generic backdoor/reverse-shell port'],
  [12345, 'Default port for the NetBus trojan'],
  [31337, '"eleet" — associated with Back Orifice and similar classic backdoors'],
]);

class SuspiciousActivityPolicy {
  static evaluatePortUsage(portUsage) {
    const reason = SUSPICIOUS_PORTS.get(portUsage.portNumber.value);
    return reason ? [`Listening on port ${portUsage.portNumber.value}: ${reason}.`] : [];
  }

  static evaluateConnection(connection) {
    const reason = SUSPICIOUS_PORTS.get(connection.remotePort.value);
    return reason ? [`Outbound connection to remote port ${connection.remotePort.value}: ${reason}.`] : [];
  }
}

module.exports = { SuspiciousActivityPolicy };
