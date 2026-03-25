import * as path from 'path';
import * as fs from 'fs';
import { Gateway, GatewayOptions, Network, Contract, Wallets, Identity } from 'fabric-network';

const CHANNEL_NAME = process.env.CHANNEL_NAME ?? 'mychannel';
const CHAINCODE_NAME = process.env.CHAINCODE_NAME ?? 'grid-monitor';
const WALLET_PATH = process.env.WALLET_PATH ?? path.resolve(__dirname, '..', 'wallet');
const CONNECTION_PROFILE_PATH =
  process.env.CONNECTION_PROFILE_PATH ??
  path.resolve(__dirname, '..', 'connection-profile.json');

let gateway: Gateway | null = null;
let network: Network | null = null;
let contract: Contract | null = null;

/** Lazily initialise and reuse the Fabric gateway connection. */
export async function getContract(): Promise<Contract> {
  if (contract) return contract;

  const wallet = await Wallets.newFileSystemWallet(WALLET_PATH);
  const identity = await wallet.get('appUser');
  if (!identity) {
    throw new Error(
      `Identity "appUser" not found in wallet at ${WALLET_PATH}.\n` +
      'Run the enrollAdmin / registerUser scripts first.',
    );
  }

  let connectionProfile: Record<string, unknown>;
  try {
    const raw = fs.readFileSync(CONNECTION_PROFILE_PATH, 'utf8');
    connectionProfile = JSON.parse(raw);
  } catch {
    throw new Error(`Cannot read connection profile at ${CONNECTION_PROFILE_PATH}`);
  }

  const opts: GatewayOptions = {
    wallet,
    identity: 'appUser',
    discovery: { enabled: true, asLocalhost: true },
  };

  gateway = new Gateway();
  await gateway.connect(connectionProfile, opts);
  network = await gateway.getNetwork(CHANNEL_NAME);
  contract = network.getContract(CHAINCODE_NAME);
  return contract;
}

export async function disconnect(): Promise<void> {
  if (gateway) {
    await gateway.disconnect();
    gateway = null;
    network = null;
    contract = null;
  }
}

export { CHANNEL_NAME, CHAINCODE_NAME };
