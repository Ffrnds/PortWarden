const { spawn } = require('node:child_process');
const { NodeProcessTerminatorAdapter } = require('../../src/adapters/driven/process/NodeProcessTerminatorAdapter');
const { ProcessId } = require('../../src/domain/value-objects/ProcessId');

// Real OS call, on a disposable process this test creates and owns — never
// against a real system process, to stay safe regardless of privilege level.
describe('NodeProcessTerminatorAdapter (integration)', () => {
  it('terminates a real child process via taskkill', async () => {
    const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)']);
    await new Promise((resolve) => child.once('spawn', resolve));

    const adapter = new NodeProcessTerminatorAdapter();
    const exited = new Promise((resolve) => child.once('exit', resolve));

    await adapter.terminate(new ProcessId(child.pid));
    await exited;

    expect(child.exitCode).not.toBeNull();
  }, 15000);
});
