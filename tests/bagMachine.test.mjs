import assert from 'node:assert/strict';
import { bagReducer, createInitialBagState } from '../js/game/bag/BagMachine.js';
import { BAG_ACCESSORY_EVENTS, BAG_GAME_EVENTS, BAG_UI_EVENTS, BAG_SYNC_EVENTS } from '../js/game/bag/events.js';

function run(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

run('opens and closes bag phase', () => {
  let s = createInitialBagState({ berries: 1, toys: 0, potions: 0, candy: 0 });
  s = bagReducer(s, { type: BAG_UI_EVENTS.OPEN_REQUEST, payload: {} });
  assert.equal(s.phase, 'OPENING');

  s = bagReducer(s, { type: BAG_GAME_EVENTS.INVENTORY_SNAPSHOT, payload: { inventory: { berries: 1, toys: 0, potions: 0, candy: 0 } } });
  assert.equal(s.phase, 'IDLE');

  s = bagReducer(s, { type: BAG_UI_EVENTS.CLOSE_REQUEST, payload: {} });
  assert.equal(s.phase, 'CLOSED');
});

run('item use optimistic + tx applied settles to IDLE', () => {
  let s = createInitialBagState({ berries: 2, toys: 0, potions: 0, candy: 0 });
  s.phase = 'IDLE';
  s = bagReducer(s, { type: BAG_UI_EVENTS.ITEM_USE_REQUEST, payload: { itemName: 'berries', txId: 'tx1' } });
  assert.equal(s.phase, 'BUSY');
  assert.equal(s.inventory.berries, 1);
  assert.ok(s.pendingTx.tx1);

  s = bagReducer(s, {
    type: BAG_GAME_EVENTS.ITEM_CONSUMED,
    payload: {
      txId: 'tx1',
      inventory: { berries: 1, toys: 0, potions: 0, candy: 0 },
    },
  });
  assert.equal(s.phase, 'IDLE');
  assert.equal(s.inventory.berries, 1);
  assert.equal(Object.keys(s.pendingTx).length, 0);
});

run('item use rejected rolls back and enters CONFLICT', () => {
  let s = createInitialBagState({ berries: 1, toys: 0, potions: 0, candy: 0 });
  s.phase = 'IDLE';
  s = bagReducer(s, { type: BAG_UI_EVENTS.ITEM_USE_REQUEST, payload: { itemName: 'berries', txId: 'tx2' } });
  assert.equal(s.inventory.berries, 0);

  s = bagReducer(s, {
    type: BAG_GAME_EVENTS.ITEM_CONSUME_REJECTED,
    payload: { txId: 'tx2', itemName: 'berries', reason: 'server_reject' },
  });
  assert.equal(s.phase, 'CONFLICT');
  assert.equal(s.inventory.berries, 1);
  assert.equal(s.ui.error, 'server_reject');
});

run('capacity overflow when no free slot for new item type', () => {
  let s = createInitialBagState({ berries: 1, toys: 1, potions: 1, candy: 0 });
  s.capacity.maxSlots = 3;
  s.capacity.usedSlots = 3;

  s = bagReducer(s, {
    type: BAG_GAME_EVENTS.ITEM_GRANTED,
    payload: { itemName: 'candy', amount: 2 },
  });

  assert.equal(s.inventory.candy, 0);
  assert.equal(s.capacity.overflowCount, 2);
});

run('replay protection blocks duplicate accessory rewardId', () => {
  const reward = {
    rewardId: 'reward-abc',
    accessoryInstanceId: 'acc-1',
    procEpoch: 100,
    rollNonce: 'nonce-1',
  };
  let s = createInitialBagState({ berries: 0, toys: 0, potions: 0, candy: 0 });

  s = bagReducer(s, { type: BAG_ACCESSORY_EVENTS.REWARD_GRANT_REQUESTED, payload: reward, ts: Date.now() });
  const toastCount = s.ui.toasts.length;

  s = bagReducer(s, { type: BAG_ACCESSORY_EVENTS.REWARD_GRANT_REQUESTED, payload: reward, ts: Date.now() + 1000 });
  assert.equal(s.ui.toasts.length, toastCount + 1);
  assert.match(s.ui.toasts[0].text, /Replay blocked/);
});

run('offline -> reconnect -> catchup transitions', () => {
  let s = createInitialBagState({ berries: 1, toys: 0, potions: 0, candy: 0 });
  s.phase = 'IDLE';

  s = bagReducer(s, { type: BAG_SYNC_EVENTS.NET_DISCONNECTED, payload: {} });
  assert.equal(s.phase, 'OFFLINE');

  s = bagReducer(s, { type: BAG_SYNC_EVENTS.NET_CONNECTED, payload: {} });
  assert.equal(s.phase, 'CATCHING_UP');

  s = bagReducer(s, { type: BAG_SYNC_EVENTS.CATCHUP_END, payload: {} });
  assert.equal(s.phase, 'IDLE');
});

console.log('All bag machine tests passed.');
