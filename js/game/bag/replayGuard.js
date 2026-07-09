// js/game/bag/replayGuard.js
export function createReplayGuardState() {
  return {
    rewardIdsSeen: new Set(),
    watermarkByAccessory: {},
    nonceWindow: {},
  };
}

export function replayGuardCheck(replayGuard, reward, nowTs = Date.now()) {
  if (!replayGuard || !reward) return { accept: false, reason: 'invalid_payload' };

  if (reward.rewardId && replayGuard.rewardIdsSeen.has(reward.rewardId)) {
    return { accept: false, reason: 'duplicate_rewardId' };
  }

  if (reward.accessoryInstanceId !== undefined && reward.procEpoch !== undefined) {
    const last = replayGuard.watermarkByAccessory[reward.accessoryInstanceId] ?? -1;
    if (Number(reward.procEpoch) <= Number(last)) {
      return { accept: false, reason: 'stale_proc_epoch' };
    }
  }

  if (reward.rollNonce) {
    const seenAt = replayGuard.nonceWindow[reward.rollNonce];
    if (seenAt && nowTs - seenAt < 10 * 60 * 1000) {
      return { accept: false, reason: 'nonce_replay' };
    }
  }

  return { accept: true };
}

export function commitReplayGuard(replayGuard, reward, nowTs = Date.now()) {
  if (!replayGuard || !reward) return replayGuard;

  if (reward.rewardId) replayGuard.rewardIdsSeen.add(reward.rewardId);

  if (reward.accessoryInstanceId !== undefined && reward.procEpoch !== undefined) {
    replayGuard.watermarkByAccessory[reward.accessoryInstanceId] = Number(reward.procEpoch);
  }

  if (reward.rollNonce) replayGuard.nonceWindow[reward.rollNonce] = nowTs;

  // prune nonce window beyond 10 min
  const floor = nowTs - 10 * 60 * 1000;
  Object.keys(replayGuard.nonceWindow).forEach((nonce) => {
    if (replayGuard.nonceWindow[nonce] < floor) delete replayGuard.nonceWindow[nonce];
  });

  // prune rewardIdsSeen to avoid unbounded growth
  if (replayGuard.rewardIdsSeen.size > 5000) {
    const keep = Array.from(replayGuard.rewardIdsSeen).slice(-2500);
    replayGuard.rewardIdsSeen = new Set(keep);
  }

  return replayGuard;
}
