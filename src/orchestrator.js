const fs = require('fs');
const path = require('path');

const QUEUE_PATH = '.claude/implement-queue.json';

function ensureQueueDir() {
  const dir = path.dirname(QUEUE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function createEmptyQueue() {
  return {
    lastUpdated: new Date().toISOString(),
    current: null,
    alexQueue: [],
    cassQueue: [],
    nigelQueue: [],
    codeyQueue: [],
    completed: [],
    failed: []
  };
}

function readQueue() {
  ensureQueueDir();
  if (!fs.existsSync(QUEUE_PATH)) {
    const queue = createEmptyQueue();
    writeQueue(queue);
    return queue;
  }
  const content = fs.readFileSync(QUEUE_PATH, 'utf8');
  return JSON.parse(content);
}

function writeQueue(queue) {
  ensureQueueDir();
  queue.lastUpdated = new Date().toISOString();
  fs.writeFileSync(QUEUE_PATH, JSON.stringify(queue, null, 2));
}

function updateQueue(updates) {
  const queue = readQueue();
  Object.assign(queue, updates);
  writeQueue(queue);
  return queue;
}

function setCurrent(slug, stage) {
  const queue = readQueue();
  queue.current = {
    slug,
    stage,
    startedAt: new Date().toISOString()
  };
  writeQueue(queue);
  return queue;
}

function clearCurrent() {
  const queue = readQueue();
  queue.current = null;
  writeQueue(queue);
  return queue;
}

function moveToNextStage(slug, fromStage, toStage) {
  const queue = readQueue();
  const fromQueueName = `${fromStage}Queue`;
  const toQueueName = `${toStage}Queue`;

  // Remove from source queue
  if (queue[fromQueueName]) {
    queue[fromQueueName] = queue[fromQueueName].filter(item => item.slug !== slug);
  }

  // Add to destination queue
  if (!queue[toQueueName]) {
    queue[toQueueName] = [];
  }

  const entry = { slug, movedAt: new Date().toISOString() };
  queue[toQueueName].push(entry);

  // Update current stage
  if (queue.current && queue.current.slug === slug) {
    queue.current.stage = toStage;
  }

  writeQueue(queue);
  return queue;
}

function markCompleted(slug, metadata = {}) {
  const queue = readQueue();

  // Remove from codeyQueue
  queue.codeyQueue = queue.codeyQueue.filter(item => item.slug !== slug);

  // Add to completed
  queue.completed.push({
    slug,
    completedAt: new Date().toISOString(),
    ...metadata
  });

  // Clear current if this was it
  if (queue.current && queue.current.slug === slug) {
    queue.current = null;
  }

  writeQueue(queue);
  return queue;
}

function markFailed(slug, stage, reason) {
  const queue = readQueue();

  // Remove from all stage queues
  ['alexQueue', 'cassQueue', 'nigelQueue', 'codeyQueue'].forEach(queueName => {
    if (queue[queueName]) {
      queue[queueName] = queue[queueName].filter(item => item.slug !== slug);
    }
  });

  // Add to failed
  queue.failed.push({
    slug,
    stage,
    reason,
    failedAt: new Date().toISOString()
  });

  // Clear current if this was it
  if (queue.current && queue.current.slug === slug) {
    queue.current = null;
  }

  writeQueue(queue);
  return queue;
}

function resetQueue() {
  const queue = createEmptyQueue();
  writeQueue(queue);
  return queue;
}

function getQueueStatus() {
  const queue = readQueue();
  return {
    current: queue.current,
    pending: {
      alex: queue.alexQueue.length,
      cass: queue.cassQueue.length,
      nigel: queue.nigelQueue.length,
      codey: queue.codeyQueue.length
    },
    completed: queue.completed.length,
    failed: queue.failed.length
  };
}

function displayQueue() {
  const queue = readQueue();

  console.log('\nImplement Feature Queue Status');
  console.log('==============================\n');

  if (queue.current) {
    console.log('Current:');
    console.log(`  ${queue.current.slug} (stage: ${queue.current.stage})`);
    console.log(`  Started: ${queue.current.startedAt}\n`);
  } else {
    console.log('Current: (none)\n');
  }

  console.log('Queues:');
  console.log(`  Alex:  ${queue.alexQueue.length} pending`);
  console.log(`  Cass:  ${queue.cassQueue.length} pending`);
  console.log(`  Nigel: ${queue.nigelQueue.length} pending`);
  console.log(`  Codey: ${queue.codeyQueue.length} pending\n`);

  if (queue.completed.length > 0) {
    console.log('Completed:');
    queue.completed.forEach(item => {
      console.log(`  - ${item.slug} (${item.completedAt})`);
    });
    console.log('');
  }

  if (queue.failed.length > 0) {
    console.log('Failed:');
    queue.failed.forEach(item => {
      console.log(`  - ${item.slug} at ${item.stage}: ${item.reason}`);
    });
    console.log('');
  }

  console.log(`Last updated: ${queue.lastUpdated}`);
}

module.exports = {
  QUEUE_PATH,
  readQueue,
  writeQueue,
  updateQueue,
  setCurrent,
  clearCurrent,
  moveToNextStage,
  markCompleted,
  markFailed,
  resetQueue,
  getQueueStatus,
  displayQueue
};
