const cron = require('node-cron');
const { exec } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function run(cmd) {
  exec(cmd, { cwd: process.cwd() }, (error, stdout, stderr) => {
    if (error) console.error(error.message);
    if (stdout) console.log(stdout.trim());
    if (stderr) console.error(stderr.trim());
  });
}

function getFetchCron() {
  try {
    const cfgPath = path.join(process.cwd(), 'config', 'research-focus.json');
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    const m = Number(cfg.fetchEveryMinutes || 30);
    const safe = Number.isNaN(m) ? 30 : Math.min(Math.max(m, 5), 60);
    return `*/${safe} * * * *`;
  } catch {
    return '*/30 * * * *';
  }
}

// Daily 09:00
cron.schedule('0 9 * * *', () => run('npm run report:daily'));

// Weekly Friday 12:00
cron.schedule('0 12 * * 5', () => run('npm run report:weekly'));

const fetchCron = getFetchCron();
cron.schedule(fetchCron, () => run('npm run papers:auto-fetch'));

console.log(`Scheduler started: daily@09:00, weekly@Fri 12:00, papers@${fetchCron}`);
