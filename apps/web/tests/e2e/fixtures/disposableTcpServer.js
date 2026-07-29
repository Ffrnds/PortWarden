// Tiny helper spawned via child_process.fork() by e2e tests that need a
// real, disposable listening process to find/kill — reports its port over
// the fork IPC channel (process.send).
import net from 'node:net';

const server = net.createServer();
server.listen(0, '127.0.0.1', () => {
  process.send({ port: server.address().port });
});

setInterval(() => {}, 1000);
