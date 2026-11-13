import { BleClient } from '@capacitor-community/bluetooth-le';

const NAME = 'TamagotchiPet';
const SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const CHARACTERISTIC = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
const SCAN_SECONDS = 15;
const MOODS = [
  { value: '1', name: 'Šťastný', icon: '😄' },
  { value: '2', name: 'Ospalý', icon: '😴' },
  { value: '3', name: 'Naštvaný', icon: '😠' },
  { value: '4', name: 'Překvapený', icon: '😲' },
];

const el = {};
['scan', 'status', 'devname', 'msg', 'face', 'grid', 'connect', 'back', 'scanmsg', 'list', 'all', 'rescan'].forEach(
  (id) => (el[id] = document.getElementById(id))
);

let deviceId = null;
let deviceName = '';
let sending = false;
let connectingId = null;
let scanning = false;
let scanError = '';
let showAll = false;
let scanTimer = null;
let renderTimer = null;
const found = new Map(); // deviceId -> { id, name, rssi }
const rowEls = new Map(); // deviceId -> <li>

function explain(err) {
  const m = String(err?.message ?? err);
  if (/permission|denied/i.test(m)) return 'Povolte oprávnění „Zařízení v okolí“ a zkuste to znovu.';
  if (/not enabled|disabled|powered|cancel/i.test(m)) return 'Zapněte Bluetooth a zkuste to znovu.';
  if (/web bluetooth|not available|not supported/i.test(m)) return 'Bluetooth není v tomto prohlížeči dostupný.';
  if (/time/i.test(m)) return 'Zařízení neodpovídá (vypršel časový limit).';
  return 'Chyba: ' + m;
}

/* ---------- Home screen ---------- */

const tiles = MOODS.map((mood) => {
  const b = document.createElement('button');
  b.className = 'mood';
  b.innerHTML = `<span>${mood.icon}</span><span>${mood.name}</span>`;
  b.onclick = () => send(mood, b);
  el.grid.append(b);
  return b;
});

function say(text, isError = false) {
  el.msg.textContent = text;
  el.msg.className = 'msg' + (isError ? ' error' : '');
}

function renderHome() {
  const on = deviceId !== null;
  el.status.textContent = on ? 'Připojeno' : 'Odpojeno';
  el.status.className = 'pill ' + (on ? 'on' : 'off');
  el.devname.textContent = on ? deviceName : 'Žádné zařízení';
  el.connect.textContent = on ? 'Odpojit' : 'Najít mazlíčka';
  tiles.forEach((t) => (t.disabled = !on));
}

function onDisconnected(id) {
  if (id !== deviceId) return; // manual disconnect already cleared deviceId
  deviceId = null;
  say('Mazlíček se odpojil. Najděte ho znovu.', true);
  renderHome();
}

async function disconnect() {
  const id = deviceId;
  deviceId = null;
  say('Odpojeno.');
  renderHome();
  await BleClient.disconnect(id).catch(() => {});
}

async function send(mood, tile) {
  if (!deviceId || sending) return;
  sending = true;
  const data = new DataView(new TextEncoder().encode(mood.value).buffer);
  try {
    try {
      await BleClient.write(deviceId, SERVICE, CHARACTERISTIC, data);
    } catch {
      // ESP32 characteristics are often write-without-response only
      await BleClient.writeWithoutResponse(deviceId, SERVICE, CHARACTERISTIC, data);
    }
    el.face.textContent = mood.icon;
    el.face.classList.remove('pop');
    void el.face.offsetWidth;
    el.face.classList.add('pop');
    say('Odesláno: ' + mood.name);
    tile.classList.add('sent');
    setTimeout(() => tile.classList.remove('sent'), 700);
  } catch (err) {
    say('Odeslání se nezdařilo. ' + explain(err), true);
  }
  sending = false;
}

/* ---------- Scan screen ---------- */

const level = (rssi) => (rssi > -60 ? 4 : rssi > -70 ? 3 : rssi > -80 ? 2 : rssi > -90 ? 1 : 0);

function buildRow(id) {
  const li = document.createElement('li');
  li.innerHTML =
    '<div class="ico"></div><div class="info"><b></b><small></small></div><div class="bars"><i></i><i></i><i></i><i></i></div>';
  li.onclick = () => pick(id);
  return li;
}

function updateRow(li, d) {
  const isPet = d.name === NAME;
  li.className = 'dev' + (isPet ? ' pet' : '') + (connectingId === d.id ? ' busy' : '');
  li.querySelector('.ico').textContent = isPet ? '🐣' : '📟';
  li.querySelector('b').textContent = d.name;
  li.querySelector('small').textContent = connectingId === d.id ? 'Připojování…' : `${d.id} · ${d.rssi} dBm`;
  li.querySelector('.bars').className = 'bars lv-' + level(d.rssi);
}

function renderList() {
  const rows = [...found.values()]
    .filter((d) => (showAll ? d.name : d.name === NAME))
    .sort((a, b) => (b.name === NAME) - (a.name === NAME));
  const keep = new Set(rows.map((d) => d.id));
  rowEls.forEach((li, id) => {
    if (!keep.has(id)) {
      li.remove();
      rowEls.delete(id);
    }
  });
  // rows are updated in place so a tap is never lost to a re-render
  rows.forEach((d, i) => {
    let li = rowEls.get(d.id);
    if (!li) rowEls.set(d.id, (li = buildRow(d.id)));
    updateRow(li, d);
    if (el.list.children[i] !== li) el.list.insertBefore(li, el.list.children[i] || null);
  });
  renderScanUi();
}

function renderScanUi() {
  const n = rowEls.size;
  el.scan.classList.toggle('scanning', scanning);
  el.scan.classList.toggle('empty', n === 0);
  el.rescan.textContent = scanning ? 'Zastavit hledání' : 'Hledat znovu';
  let text = scanError;
  if (!text) {
    if (scanning) text = n ? 'Hledám dál… Vyberte mazlíčka.' : 'Hledám zařízení v okolí…';
    else text = n ? 'Klepněte na mazlíčka pro připojení.' : 'Mazlíček nenalezen. Zapněte ho, přibližte telefon a hledejte znovu.';
  }
  el.scanmsg.textContent = text;
  el.scanmsg.className = 'msg' + (scanError ? ' error' : '');
}

function onResult(r) {
  const id = r.device.deviceId;
  const name = r.localName || r.device.name || found.get(id)?.name || '';
  found.set(id, { id, name, rssi: r.rssi ?? -100 });
  renderTimer ??= setTimeout(() => {
    renderTimer = null;
    renderList();
  }, 300);
}

async function startScan() {
  stopScan();
  scanError = '';
  found.clear();
  renderList();
  try {
    await BleClient.initialize({ androidNeverForLocation: true });
    if (!(await BleClient.isEnabled())) await BleClient.requestEnable();
    scanning = true;
    renderScanUi();
    // scanMode 2 = low latency (fastest discovery)
    await BleClient.requestLEScan({ allowDuplicates: true, scanMode: 2 }, onResult);
    scanTimer = setTimeout(stopScan, SCAN_SECONDS * 1000);
  } catch (err) {
    scanning = false;
    scanError = explain(err);
    renderScanUi();
  }
}

function stopScan() {
  clearTimeout(scanTimer);
  if (!scanning) return;
  scanning = false;
  BleClient.stopLEScan().catch(() => {});
  renderList();
}

async function pick(id) {
  if (connectingId) return;
  const name = found.get(id)?.name;
  connectingId = id;
  scanError = '';
  stopScan();
  renderList();
  try {
    await BleClient.connect(id, onDisconnected, { timeout: 10000 });
    const services = await BleClient.getServices(id);
    if (!services.some((s) => s.uuid.toLowerCase() === SERVICE)) throw new Error('Zařízení nemá službu mazlíčka.');
    deviceId = id;
    deviceName = name || 'Neznámé zařízení';
    connectingId = null;
    say('Připojeno. Vyberte náladu.');
    renderHome();
    history.back(); // closes the scan screen
  } catch (err) {
    connectingId = null;
    await BleClient.disconnect(id).catch(() => {});
    scanError = explain(err);
    renderList();
  }
}

function openScan() {
  if (document.body.classList.contains('on-scan')) return;
  history.pushState({ scan: true }, ''); // lets the Android back button close the screen
  document.body.classList.add('on-scan');
  startScan();
}

function closeScan() {
  stopScan();
  document.body.classList.remove('on-scan');
}

/* ---------- Wiring ---------- */

el.connect.onclick = () => (deviceId ? disconnect() : openScan());
el.back.onclick = () => history.back();
el.rescan.onclick = () => (scanning ? stopScan() : startScan());
el.all.onclick = () => {
  showAll = !showAll;
  el.all.classList.toggle('on', showAll);
  renderList();
};
window.addEventListener('popstate', closeScan);
renderHome();
