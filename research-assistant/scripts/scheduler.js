const cron = require('node-cron');
const { exec } = require('node:child_process');

function run(cmd) {
  exec(cmd, { cwd: process.cwd() }, (error, stdout, stderr) => {
    if (error) console.error(error.message);
    if (stdout) console.log(stdout.trim());
    if (stderr) console.error(stderr.trim());
  });
}

// Daily 09:00
cron.schedule('0 9 * * *', () => run('npm run report:daily'));

// Weekly Friday 12:00
cron.schedule('0 12 * * 5', () => run('npm run report:weekly'));

// Auto fetch papers: every 30 minutes
cron.schedule('*/30 * * * *', () => run('npm run papers:auto-fetch'));

console.log('Scheduler started: daily@09:00, weekly@Fri 12:00, papers@*/30min');
