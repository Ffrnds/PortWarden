const { PortInspectorPort } = require('../../../src/domain/ports/outbound/PortInspectorPort');
const { ListPortsPort } = require('../../../src/domain/ports/inbound/ListPortsPort');

// Ports carry no business logic, so we don't test every single one — this
// illustrates the contract pattern shared by all of them (outbound and inbound).
describe('Port contracts', () => {
  it('the base outbound port throws when its method is not overridden', async () => {
    const port = new PortInspectorPort();

    await expect(port.listActivePorts()).rejects.toThrow(/must be implemented/);
  });

  it('an adapter satisfies the outbound contract by overriding the method', async () => {
    class FakePortInspectorAdapter extends PortInspectorPort {
      async listActivePorts() {
        return [];
      }
    }

    const adapter = new FakePortInspectorAdapter();

    await expect(adapter.listActivePorts()).resolves.toEqual([]);
    expect(adapter).toBeInstanceOf(PortInspectorPort);
  });

  it('the base inbound port throws when its method is not overridden', async () => {
    const port = new ListPortsPort();

    await expect(port.execute()).rejects.toThrow(/must be implemented/);
  });
});
