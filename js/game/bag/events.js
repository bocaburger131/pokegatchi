// js/game/bag/events.js — Bag event name constants
export const BAG_GAME_EVENTS = Object.freeze({
  OVERFLOW_CREATED: 'bag.overflow_created',
  ITEM_USED: 'bag.item_used',
  ITEM_ADDED: 'bag.item_added',
  INVENTORY_SYNCED: 'bag.inventory_synced',
});

export const BAG_UI_EVENTS = Object.freeze({
  OPEN_REQUEST: 'bag.ui.open_request',
  CLOSE_REQUEST: 'bag.ui.close_request',
  ITEM_USE_REQUEST: 'bag.ui.item_use_request',
});
