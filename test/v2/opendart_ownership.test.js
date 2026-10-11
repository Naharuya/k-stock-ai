// Test for OpenDART ownership connector stub
// This test verifies the mock implementation
// KSTOCK_AI_MODE=mock is enforced
// No real API calls or data fetching
// All responses are mocked

import { fetchOpenDARTOwnership } from '../src/v2/opendart_ownership';
import { expect } from 'chai';
import 'mocha';

describe('OpenDART Ownership Connector Stub', () => {
  it('should return a mocked response', async () => {
    const response = await fetchOpenDARTOwnership();
    expect(response.status).to.equal('success');
    expect(response.data).to.have.property('company');
    expect(response.data).to.have.property('ownership');
    expect(response.data.ownership).to.have.property('director');
    expect(response.data.ownership).to.have.property('percentage');
    expect(response.data.ownership).to.have.property('date');
  });
});