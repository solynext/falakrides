// Settings UI test with a mocked password-change API; never changes account passwords.
import {spawn} from "node:child_process";
import {mkdtemp, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join, resolve} from "node:path";
import assert from "node:assert/strict";
import WebSocket from "next/dist/compiled/ws/index.js";
import {config} from "dotenv";
config({path:[".env.local", ".env"],quiet:true});

const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const email = process.env.TEST_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
const password = process.env.TEST_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
if (!email || !password) throw new Error('Administrator test credentials are required.');
const signIn = await fetch(base + '/api/auth/sign-in/email', {method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
if (!signIn.ok) throw new Error('Administrator test sign-in failed.');
const cookiePairs = signIn.headers.getSetCookie().map(cookie=>cookie.split(';')[0]);
const testCookie = cookiePairs.join('; ');
const profile = await mkdtemp(join(tmpdir(), "falak-password-settings-"));
const browser = spawn(process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", "--disable-gpu", "--disable-extensions", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], {windowsHide: true});
let socket;
try {
  const endpoint = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Chrome did not start")), 15000);
    browser.on("error", reject);
    browser.stderr.on("data", chunk => {const match = String(chunk).match(/DevTools listening on (ws:\/\/[^\s]+)/); if (match) {clearTimeout(timer); resolve(match[1]);}});
  });
  const address = new URL(endpoint);
  const tabs = await (await fetch(`http://${address.host}/json/list`)).json();
  socket = new WebSocket(tabs.find(tab => tab.type === "page").webSocketDebuggerUrl);
  await new Promise(resolve => socket.addEventListener("open", resolve, {once: true}));
  let sequence = 0;
  const pending = new Map();
  socket.addEventListener("message", ({data}) => {const message = JSON.parse(data); const callback = pending.get(message.id); if (callback) {pending.delete(message.id); if (message.error) callback.reject(new Error(message.error.message)); else callback.resolve(message.result);}});
  const command = (method, params = {}) => new Promise((resolve, reject) => {const id = ++sequence; const timer = setTimeout(() => reject(new Error(`DevTools timed out: ${method}`)), 15000); pending.set(id, {resolve: result => {clearTimeout(timer); resolve(result);}, reject: error => {clearTimeout(timer); reject(error);}}); socket.send(JSON.stringify({id, method, params}));});
  const evaluate = async expression => {const result = await command("Runtime.evaluate", {expression, returnByValue: true, awaitPromise: true}); if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails)); return result.result.value;};
  const wait = async expression => {const deadline = Date.now() + 30000; while (Date.now() < deadline) {if (await evaluate(`Boolean(${expression})`)) return; await new Promise(resolve => setTimeout(resolve, 100));} throw new Error(`Timed out: ${expression}`);};
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const input = (selector, value) => evaluate(`(() => {const element = document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, ${JSON.stringify(value)}); element.dispatchEvent(new Event('input', {bubbles:true}));})()`);
  await command('Runtime.enable');
  await command('Network.enable');
  await command('Network.setCookies', {cookies:cookiePairs.map(pair=>{const index=pair.indexOf('=');return {name:pair.slice(0,index),value:pair.slice(index+1),url:base,httpOnly:true};})});
  await command('Page.navigate', {url:base+'/admin/settings'});
  await wait("document.querySelector('.adm-password-settings input[name=currentPassword]')");
  await wait("Object.keys(document.querySelector('.adm-password-settings input')).some(key=>key.startsWith('__reactProps'))");
  await evaluate(`(() => {const original=window.fetch; window.__passwordCalls=[]; window.fetch=async (url,options)=>{if(url!=='/api/admin/password')return original(url,options);const payload=JSON.parse(options.body);window.__passwordCalls.push(payload);return payload.currentPassword==='correct-test-current-password'?Response.json({ok:true}):Response.json({error:'Your current password is incorrect.'},{status:400});};})()`);
  await input('.adm-password-settings input[name=currentPassword]', 'incorrect-test-password');
  await input('.adm-password-settings input[name=newPassword]', 'new long test passphrase');
  await input('.adm-password-settings input[name=confirmPassword]', 'different long test passphrase');
  await evaluate("document.querySelector('.adm-password-settings form').requestSubmit()");
  await wait("document.querySelector('.adm-password-error')?.textContent.includes('do not match')");
  assert.equal(await evaluate('window.__passwordCalls.length'),0);
  await input('.adm-password-settings input[name=confirmPassword]', 'new long test passphrase');
  await evaluate("document.querySelector('.adm-password-settings form').requestSubmit()");
  await wait("document.querySelector('.adm-password-error')?.textContent.includes('incorrect')");
  await click('a[href="/admin/dashboard"]');
  await wait("document.querySelector('.unsaved-dialog').open");
  await click('.unsaved-keep');
  await wait("!document.querySelector('.unsaved-dialog').open");
  await input('.adm-password-settings input[name=currentPassword]', 'correct-test-current-password');
  await evaluate("document.querySelector('.adm-password-settings form').requestSubmit()");
  await wait("document.querySelector('.adm-password-success')");
  assert.equal(await evaluate("Array.from(document.querySelectorAll('.adm-password-settings input')).every(input=>input.value==='')"),true);
  assert.equal(await evaluate('window.__passwordCalls.length'),2);
  await click('a[href="/admin/dashboard"]');
  await wait("location.pathname==='/admin/dashboard'");
  assert.equal(await evaluate("document.querySelector('.unsaved-dialog').open"),false);
  console.log('PASS: settings password form, mismatch/current-password feedback, unsaved-change protection, successful save and secret clearing (mock API).');
} finally {
  await fetch(base+'/api/auth/sign-out',{method:'POST',headers:{Origin:base,'Content-Type':'application/json',Cookie:testCookie},body:'{}'}).catch(()=>{});
  socket?.close(); browser.kill();
  // Verify the generated profile remains under the intended temporary directory.
  if (!resolve(profile).startsWith(resolve(tmpdir()) + "\\") || !profile.includes("falak-password-settings-")) throw new Error("Unexpected browser profile path");
  await rm(profile, {recursive: true, force: true, maxRetries: 8, retryDelay: 250});
}
