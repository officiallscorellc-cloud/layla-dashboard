#!/usr/bin/env node
/**
 * Layla Dashboard CLI
 * Usage:
 *   node cli.js status                    - Get current status
 *   node cli.js working                   - Set status to working
 *   node cli.js idle                      - Set status to idle
 *   node cli.js start "Task title"        - Start working on a task
 *   node cli.js complete                  - Complete current task
 *   node cli.js add "Title" "Desc" high   - Add task to queue
 *   node cli.js urgent "Title" "Desc"     - Add urgent task (jumps to top)
 */

const http = require('http');

const BASE_URL = 'http://localhost:3847';

function api(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  const [,, command, ...args] = process.argv;

  try {
    switch (command) {
      case 'status': {
        const data = await api('GET', '/api/status');
        console.log(`Status: ${data.status}`);
        console.log(`Current Task: ${data.currentTask?.title || 'None'}`);
        console.log(`Queue: ${data.queue.length} tasks`);
        break;
      }

      case 'working': {
        await api('POST', '/api/status', { status: 'working' });
        console.log('Status set to WORKING');
        break;
      }

      case 'idle': {
        await api('POST', '/api/status', { status: 'idle' });
        console.log('Status set to IDLE');
        break;
      }

      case 'start': {
        const title = args[0];
        const description = args[1] || '';
        const priority = args[2] || 'medium';
        await api('POST', '/api/task/current', {
          task: { title, description, priority, source: 'cli' }
        });
        console.log(`Started: ${title}`);
        break;
      }

      case 'complete': {
        await api('POST', '/api/task/complete');
        console.log('Task completed');
        break;
      }

      case 'add': {
        const title = args[0];
        const description = args[1] || '';
        const priority = args[2] || 'medium';
        await api('POST', '/api/queue/add', {
          task: { title, description, priority, source: 'cli' }
        });
        console.log(`Added to queue: ${title}`);
        break;
      }

      case 'urgent': {
        const title = args[0];
        const description = args[1] || '';
        await api('POST', '/api/queue/urgent', {
          task: { title, description, source: 'discord' }
        });
        console.log(`🔥 URGENT task added: ${title}`);
        break;
      }

      default:
        console.log(`
Layla Dashboard CLI

Commands:
  status              - Get current status
  working             - Set status to working  
  idle                - Set status to idle
  start "Title" [Desc] [Priority] - Start a task
  complete            - Complete current task
  add "Title" [Desc] [Priority]   - Add to queue
  urgent "Title" [Desc]           - Add urgent (jumps queue)

Priority: urgent, high, medium, low
        `);
    }
  } catch (e) {
    console.error('Error:', e.message);
    console.error('Is the dashboard server running? (npm start)');
  }
}

main();
