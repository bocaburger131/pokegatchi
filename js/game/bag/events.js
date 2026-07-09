// js/game/bag/events.js
export const BAG_UI_EVENTS = {
  OPEN_REQUEST: 'pg.ui.bag.open.request',
  OPENED: 'pg.ui.bag.opened',
  CLOSE_REQUEST: 'pg.ui.bag.close.request',
  CLOSED: 'pg.ui.bag.closed',
  ITEM_SELECT_REQUEST: 'pg.ui.bag.item.select.request',
  ITEM_USE_REQUEST: 'pg.ui.bag.item.use.request',
  RECONCILE_REQUEST: 'pg.ui.bag.reconcile.request',
  RECOVERY_RETRY: 'pg.ui.bag.recovery.retry',
};

export const BAG_GAME_EVENTS = {
  ITEM_GRANTED: 'pg.game.item.granted',
  ITEM_GRANT_REJECTED: 'pg.game.item.grant.rejected',
  ITEM_CONSUMED: 'pg.game.item.consumed',
  ITEM_CONSUME_REJECTED: 'pg.game.item.consume.rejected',
  CAPACITY_CHANGED: 'pg.game.item.capacity.changed',
  CAPACITY_FULL: 'pg.game.item.capacity.full',
  OVERFLOW_CREATED: 'pg.game.item.overflow.created',
  INVENTORY_SNAPSHOT: 'pg.game.item.inventory.snapshot',
  TX_APPLIED: 'pg.game.item.tx.applied',
  TX_REVERTED: 'pg.game.item.tx.reverted',
};

export const BAG_ACCESSORY_EVENTS = {
  REWARD_GRANT_REQUESTED: 'pg.game.accessory.reward.grant.requested',
  REWARD_GRANTED: 'pg.game.accessory.reward.granted',
  REWARD_REJECTED: 'pg.game.accessory.reward.rejected',
  REWARD_DUPLICATE: 'pg.game.accessory.reward.duplicate_detected',
};

export const BAG_SYNC_EVENTS = {
  NET_CONNECTED: 'pg.net.connected',
  NET_DISCONNECTED: 'pg.net.disconnected',
  CATCHUP_START: 'pg.sync.catchup.start',
  CATCHUP_END: 'pg.sync.catchup.end',
  SEQ_GAP: 'pg.sync.seq_gap.detected',
};
