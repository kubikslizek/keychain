import { BleClient } from '@capacitor-community/bluetooth-le';

const NAME = 'TamagotchiPet';
const SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const CHARACTERISTIC = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';

const $ = (id) => document.getElementById(id);
const statusEl = $('status');
const msgEl = $('msg');
const connectBtn = $('connect');
const moodBtns = document.querySelectorAll('.mood');

let deviceId = null;
let busy = false;

function say(text, isError = false) {
  msgEl.textContent = text;
  msgEl.className = 'msg' + (isError ? ' error' : '');
}

function render() {
  const on = deviceId !== null;
  statusEl.textContent = on ? 'Připojeno' : 'Odpojeno';
  statusEl.className = 'status ' + (on ? 'on' : 'off');
  connectBtn.textContent = busy && !on ? 'Připojování…' : on ? 'Odpojit' : 'Připojit mazlíčka';
  connectBtn.disabled = busy;
  moodBtns.forEach((b) => (b.disabled = !on || busy));
}

function explain(err) {
  const m = String(err?.message ?? err);
  if (/cancel/i.test(m)) return 'Zařízení nenalezeno nebo výběr zrušen. Zapněte mazlíčka a zkuste to znovu.';
  if (/permission|denied/i.test(m)) return 'Povolte oprávnění „Zařízení v okolí“ a zkuste to znovu.';
  if (/not enabled|disabled|powered/i.test(m)) return 'Zapněte Bluetooth a zkuste to znovu.';
  if (/web bluetooth|not available|not supported/i.test(m)) return 'Bluetooth není v tomto prohlížeči dostupný.';
  if (/time/i.test(m)) return 'Zařízení neodpovídá (vypršel časový limit).';
  return 'Chyba: ' + m;
}

function onDisconnected(id) {
  if (id !== deviceId) return; // manual disconnect already cleared deviceId
  deviceId = null;
  say('Mazlíček se odpojil. Připojte ho znovu.', true);
  render();
}

async function connect() {
  busy = true;
  render();
  say('Hledám ' + NAME + '…');
  let picked = null;
  try {
    await BleClient.initialize({ androidNeverForLocation: true });
    const device = await BleClient.requestDevice({ name: NAME, optionalServices: [SERVICE] });
    picked = device.deviceId;
    say('Připojuji…');
    await BleClient.connect(picked, onDisconnected, { timeout: 10000 });
    deviceId = picked;
    say('Připojeno k ' + (device.name || NAME) + '.');
  } catch (err) {
    deviceId = null;
    if (picked) await BleClient.disconnect(picked).catch(() => {});
    say(explain(err), true);
  }
  busy = false;
  render();
}

async function disconnect() {
  const id = deviceId;
  deviceId = null;
  render();
  say('Odpojeno.');
  await BleClient.disconnect(id).catch(() => {});
}

async function send(button) {
  if (!deviceId || busy) return;
  busy = true;
  render();
  const data = new DataView(new TextEncoder().encode(button.dataset.value).buffer);
  try {
    try {
      await BleClient.write(deviceId, SERVICE, CHARACTERISTIC, data);
    } catch {
      // ESP32 characteristics are often write-without-response only
      await BleClient.writeWithoutResponse(deviceId, SERVICE, CHARACTERISTIC, data);
    }
    say('Odesláno: ' + button.dataset.name);
  } catch (err) {
    say('Odeslání se nezdařilo. ' + explain(err), true);
  }
  busy = false;
  render();
}

connectBtn.addEventListener('click', () => (deviceId ? disconnect() : connect()));
moodBtns.forEach((b) => b.addEventListener('click', () => send(b)));
render();
