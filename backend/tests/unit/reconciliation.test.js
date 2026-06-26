'use strict';

const { diffConversions } = require('../../src/services/ReconciliationService');

const contract = { pricePerConversion: 40, currency: 'USD' };

describe('Unit: ReconciliationService.diffConversions (CPA settlement)', () => {
  it('marca matched cuando Milo y el partner coinciden por policyRef', () => {
    const milo = [{ leadId: 'l1', policyRef: 'POL-1' }, { leadId: 'l2', policyRef: 'POL-2' }];
    const report = diffConversions(milo, ['POL-1', 'POL-2'], contract);

    expect(report.summary.matchedCount).toBe(2);
    expect(report.summary.cpaDeltaCount).toBe(0);
    expect(report.summary.cpaDeltaAmount).toBe(0);
    expect(report.missingInMilo).toEqual([]);
    expect(report.unreportedByPartner).toEqual([]);
  });

  it('detecta sub-reporte del partner por API: reportó una póliza que Milo no registró', () => {
    const milo = [{ leadId: 'l1', policyRef: 'POL-1' }];
    const report = diffConversions(milo, ['POL-1', 'POL-2'], contract);

    expect(report.missingInMilo).toEqual(['pol-2']); // normalizado
    expect(report.summary.cpaDeltaCount).toBe(1); // partner reportó 2, Milo registró 1
    expect(report.summary.cpaDeltaAmount).toBe(40); // Milo sub-facturó 1 × $40
  });

  it('detecta conversión de Milo ausente en el export del partner (posible over-billing)', () => {
    const milo = [{ leadId: 'l1', policyRef: 'POL-1' }, { leadId: 'l2', policyRef: 'POL-9' }];
    const report = diffConversions(milo, ['POL-1'], contract);

    expect(report.unreportedByPartner).toEqual([{ ref: 'pol-9', leadId: 'l2' }]);
    expect(report.summary.cpaDeltaCount).toBe(-1); // Milo registró 2, partner reportó 1
    expect(report.summary.cpaDeltaAmount).toBe(-40);
  });

  it('cuenta como no verificables las conversiones de Milo sin policyRef', () => {
    const milo = [{ leadId: 'l1', policyRef: null }, { leadId: 'l2', policyRef: 'POL-2' }];
    const report = diffConversions(milo, ['POL-2'], contract);

    expect(report.unverifiable).toEqual(['l1']);
    expect(report.summary.unverifiableCount).toBe(1);
    expect(report.summary.matchedCount).toBe(1);
  });

  it('normaliza y deduplica refs (espacios, mayúsculas, repetidos)', () => {
    const milo = [{ leadId: 'l1', policyRef: ' POL-1 ' }];
    const report = diffConversions(milo, ['pol-1', 'POL-1', 'pol-1 '], contract);

    expect(report.summary.reportedCount).toBe(1); // deduplicado
    expect(report.summary.matchedCount).toBe(1);
    expect(report.summary.cpaDeltaCount).toBe(0);
  });
});
