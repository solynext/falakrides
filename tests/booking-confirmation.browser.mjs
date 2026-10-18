// Mocked booking API: this test never creates a booking or sends email.
import {spawn} from 'node:child_process';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import WebSocket from 'next/dist/compiled/ws/index.js';
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const profile = await mkdtemp(join(tmpdir(), 'falak-booking-browser-'));
const browser = spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--disable-extensions', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], {windowsHide: true});
let socket;
try {
  const endpoint = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Chrome did not start')), 15000);
    browser.on('error', error => {clearTimeout(timer); reject(error);});
    browser.stderr.on('data', chunk => {const match = String(chunk).match(/DevTools listening on (ws:\/\/[^\s]+)/); if (match) {clearTimeout(timer); resolve(match[1]);}});
  });
  const tabs = await (await fetch(`http://${new URL(endpoint).host}/json/list`)).json();
  socket = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
  await new Promise(resolve => socket.addEventListener('open', resolve, {once: true}));
  let sequence = 0;
  const pending = new Map();
  socket.addEventListener('message', ({data}) => {const message = JSON.parse(data); const call = pending.get(message.id); if (call) {pending.delete(message.id); message.error ? call.reject(new Error(message.error.message)) : call.resolve(message.result);}});
  const command = (method, params = {}) => new Promise((resolve, reject) => {const id = ++sequence; const timer = setTimeout(() => reject(new Error(`DevTools timeout: ${method}`)), 30000); pending.set(id, {resolve: result => {clearTimeout(timer); resolve(result);}, reject: error => {clearTimeout(timer); reject(error);}}); socket.send(JSON.stringify({id, method, params}));});
  const evaluate = async expression => {const result = await command('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true}); if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails)); return result.result.value;};
  const wait = async expression => {const deadline = Date.now() + 30000; while (Date.now() < deadline) {if (await evaluate(`Boolean(${expression})`)) return; await new Promise(resolve => setTimeout(resolve, 100));} throw new Error(`Timed out: ${expression}`);};
  const input = (selector, value) => evaluate(`(() => {const el=document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(value)}); el.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  const submit = () => evaluate(`document.querySelector('.adm-reset-card form').requestSubmit()`);
  await command('Page.navigate', {url: base + '/book-a-ride'});
  await wait(`document.querySelector('.falak-booking input[name=email]') && Object.keys(document.querySelector('.falak-booking input')).some(key=>key.startsWith('__reactProps'))`);
  await evaluate(`window.bookingRequests=[]; const original=window.fetch; window.fetch=async function(url,options){if(url==='/api/bookings'&&options?.method==='POST'){window.bookingRequests.push(JSON.parse(options.body));await new Promise(resolve=>setTimeout(resolve,250));return Response.json({booking:{reference:'FR-BROWSER-TEST'}});}return original.apply(this,arguments);};`);
  for (const [name,value] of [['name','Browser Test'],['email','booking@example.com'],['phone','+966501234567'],['pickup','Makkah'],['destination','Jeddah'],['date','2099-12-20'],['time','10:00']]) await input('.falak-booking input[name='+name+']',value);
  await evaluate(`(()=>{const el=document.querySelector('.falak-booking select[name=vehicle]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(el,Array.from(el.options).find(option=>option.value).value);el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await evaluate(`document.querySelector('.falak-booking-send').click()`);
  await wait(`document.querySelector('.falak-booking-status')?.textContent.includes('FR-BROWSER-TEST')`);
  assert.equal(await evaluate(`window.bookingRequests.length`),1);
  assert.equal(await evaluate(`window.bookingRequests[0].email`),'booking@example.com');
  assert.match(await evaluate(`window.bookingRequests[0].idempotencyKey`),/^[a-f0-9-]{36}$/);
  assert.equal(await evaluate(`document.querySelector('.falak-booking-send').disabled`),true);
  assert.match(await evaluate(`document.querySelector('.falak-booking-whatsapp').href`),/FR-BROWSER-TEST/);
  assert.match(await evaluate(`document.querySelector('.falak-booking-status').textContent`),/email your confirmation/);
  console.log('PASS: booking email field, saved request payload, booking reference, duplicate-submit prevention and optional WhatsApp follow-up (mock API).');
} finally {
  socket?.close(); browser.kill();
  await new Promise(resolve => browser.exitCode !== null ? resolve() : browser.once('exit', resolve));
  await rm(profile, {recursive: true, force: true, maxRetries: 5, retryDelay: 200});
}
