const { Writable } = require('node:stream');
const { PinoLoggerAdapter } = require('../../../../../src/adapters/driven/logging/PinoLoggerAdapter');

// pino only recognizes a destination as a stream if it looks like a real
// Node stream (has `.writable`/`._writableState`) — a plain object with a
// `.write()` method is silently ignored and pino falls back to
// process.stdout. So the fake here is a real Writable, not a duck-typed one.
function createCapturingStream() {
  const lines = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(JSON.parse(chunk.toString()));
      callback();
    },
  });
  stream.lines = lines;
  return stream;
}

describe('PinoLoggerAdapter', () => {
  it('writes a structured info log with the message and metadata', () => {
    const stream = createCapturingStream();
    const logger = new PinoLoggerAdapter(stream);

    logger.info('port freed', { port: 8080 });

    expect(stream.lines).toHaveLength(1);
    expect(stream.lines[0].msg).toBe('port freed');
    expect(stream.lines[0].port).toBe(8080);
    expect(stream.lines[0].level).toBe(30); // pino's numeric level for "info"
  });

  it('writes error logs at a higher level than info', () => {
    const stream = createCapturingStream();
    const logger = new PinoLoggerAdapter(stream);

    logger.error('failed to terminate process', { pid: 1234 });

    expect(stream.lines[0].level).toBe(50); // pino's numeric level for "error"
    expect(stream.lines[0].pid).toBe(1234);
  });
});
