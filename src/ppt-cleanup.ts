import { deleteExpiredDecks } from './lib/ppt/storage';

deleteExpiredDecks()
  .then(count => {
    console.log(`Deleted ${count} expired AI PPT object(s)`);
  })
  .catch(error => {
    console.error('PPT cleanup failed', error instanceof Error ? error.name : 'UnknownError');
    process.exitCode = 1;
  });
