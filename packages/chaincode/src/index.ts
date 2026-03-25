import { GridMonitorContract } from './gridChaincode';

export { GridMonitorContract };
export * from './types';

// Fabric shim entry point
const Shim = require('fabric-shim');
Shim.start(new GridMonitorContract());
