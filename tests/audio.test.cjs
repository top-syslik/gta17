const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const events = {}, clicks = {}, nodes = [], contexts = [];
const param = () => ({value: 0, setTargetAtTime(v) { assert(Number.isFinite(v)); this.value = v; }, setValueAtTime(v) { this.value = v; }, exponentialRampToValueAtTime(v) { assert(v > 0); this.value = v; }});
function node() {
  const n = {gain: param(), frequency: param(), playbackRate: param(), pan: param(), connect(target) {this.output = target;}, disconnect() {}, start() {this.started = true;}, stop() {this.stopped = true;}};
  nodes.push(n); return n;
}
class AudioContext {
  constructor() { this.currentTime = 0; this.sampleRate = 44100; this.state = 'suspended'; contexts.push(this); }
  createGain() { return node(); }
  createDynamicsCompressor() { return node(); }
  createBuffer(channels, length, sampleRate) { const data = new Float32Array(length); return {length, sampleRate, duration: length / sampleRate, getChannelData: () => data}; }
  createBufferSource() { return node(); }
  createBiquadFilter() { return node(); }
  createStereoPanner() { return node(); }
  createOscillator() { return node(); }
  resume() { this.state = 'running'; return Promise.resolve(); }
  suspend() { this.state = 'suspended'; return Promise.resolve(); }
}
const button = {setAttribute() {}, addEventListener: (name, fn) => clicks[name] = fn};
const preview = {addEventListener: (name, fn) => clicks.preview = fn};
const document = {hidden: false, getElementById: id => id === 'sound-test' ? preview : button, addEventListener: (name, fn) => events[name] = fn};
let stored;
const timers = [];
const sandbox = {atob, setTimeout: (fn) => timers.push(fn), AudioContext, document, localStorage: {getItem: () => null, setItem: (key, value) => stored = value}};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname, '../assets/audio/samples.js'), 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname, '../audio.js'), 'utf8'), sandbox);
assert.equal(contexts.length, 0, 'must wait for user gesture');
clicks.click(); assert.equal(contexts.length, 1);
assert.equal(stored, 'false', 'first sound-button click enables instead of muting');
assert(!nodes.some(n => n.started), 'unlock must not start ambient wind');
const audio = sandbox.cityAudio, player = {x: 0, y: 0, angle: 0};
const reports = [];
for (const id of ['pistol', 'rifle', 'ak', 'minigun']) {
 const start = nodes.length;
 audio.gunshot(id);
 const shot = nodes.slice(start).find(n => n.started && n.buffer);
 assert(shot, id + ' must play a buffered report');
 const data = shot.buffer.getChannelData(0);
 assert(data.every(v => Number.isFinite(v) && Math.abs(v) <= .901), 'gunshot must not clip');
 const energy = Math.sqrt(data.reduce((sum, v) => sum + v*v, 0) / data.length);
 assert(energy > .02, id + ' must be audible');
 assert(Math.abs(data[data.length - 1]) < .001, 'report must fade out without a click');
 reports.push(shot.buffer.duration);
 let disconnected = 0;
 shot.disconnect = () => disconnected++;
 shot.output.disconnect = () => disconnected++;
 shot.onended();
 assert.equal(disconnected, 2, 'ended report releases its audio graph');
}
assert.equal(new Set(reports).size, 4, 'weapons must have distinct report lengths');
const car = {x: 0, y: 20, width: 20, speed: 30};
audio.update(.05, player, [car], [], 0, false, false);
const engineTone = nodes.find(n => n.loop);
assert(engineTone, 'engine uses a recorded loop');
assert(engineTone.buffer.duration > 3, 'engine must use multi-second recording, not synthetic pulse');
const initialPitch = engineTone.playbackRate.value;
car.speed = 34; audio.update(.05, player, [car], [], 0, false, false);
assert(engineTone.playbackRate.value > initialPitch, 'engine pitch rises with speed');
car.speed = 30;
const count = nodes.length;
audio.update(.05, player, [car], [], 0, false, false);
assert.equal(nodes.length, count, 'standing must not create footsteps or duplicate engines');
audio.update(.05, player, [car], [], 40, false, false);
assert(nodes.length > count, 'walking makes footsteps');
const step = nodes.slice(count).find(n => n.started && n.stopped);
assert(step?.buffer, 'footstep uses a shoe impact buffer');
for(const [name, buffer] of [['step', step.buffer], ['engine', engineTone.buffer]]) {
 const data = buffer.getChannelData(0);
 const rms = Math.sqrt(data.reduce((sum, v) => sum + v*v, 0) / data.length);
 assert(rms > .015 && rms < .8, name + ' signal has audible energy without clipping');
 assert(data.every(Number.isFinite), name + ' signal is finite');
}
car.parked = true;
audio.update(.05, player, [car], [], 0, false, false);
assert.equal(engineTone.output.output.gain.value, 0, 'engine falls silent after exiting and parking');
car.parked = false;
const silentCar = {...car, parked: true};
const beforeParked = nodes.length;
audio.update(.05, player, [silentCar], [], 0, false, false);
assert.equal(nodes.length, beforeParked, 'parked cars do not create engines');
assert(nodes.some(n => n.pan.value > 0), 'car on right is audible on right');
car.y = -20; audio.update(.05, player, [car], [], 0, false, false);
assert(nodes.some(n => n.pan.value < 0), 'car on left is audible on left');
const walker = {x: 0, y: 10, gait: 0, wait: 0};
audio.update(.05, player, [car], [walker], 0, false, false);
const walkerCount = nodes.length;
walker.gait = Math.PI;
audio.update(.05, player, [car], [walker], 0, false, false);
assert(nodes.length > walkerCount, 'nearby NPC movement makes footsteps');
const standingCount = nodes.length;
audio.update(.05, player, [car], [walker], 0, false, false);
assert.equal(nodes.length, standingCount, 'stationary NPC makes no footsteps');
audio.setPaused(true); const pausedCount = nodes.length;
audio.gunshot('rifle');
audio.update(10, player, [car], [], 100, true, true);
assert.equal(nodes.length, pausedCount, 'pause prevents world sound effects');
audio.setPaused(false); clicks.click(); assert.equal(stored, 'true');
const mutedCount = nodes.length;
audio.gunshot('minigun');
audio.update(10, player, [car], [], 100, true, true);
assert.equal(nodes.length, mutedCount, 'mute prevents sound effects');
clicks.click(); assert.equal(stored, 'false'); assert.equal(contexts.length, 1);
document.hidden = true; events.visibilitychange(); assert.equal(contexts[0].state, 'suspended');
events.keydown(); assert.equal(contexts[0].state, 'running');
console.log('Audio checks passed: gesture, steps, stereo, pause, mute, visibility.');

const previewStart = nodes.length;
const previewResult = clicks.preview();
Promise.resolve().then(async () => {
 const previewNodes = nodes.slice(previewStart);
 assert(previewNodes.some(n => n.buffer && n.stopped), 'preview plays footstep');
 const engine = previewNodes.find(n => n.loop);
 assert(engine, 'preview plays engine without nearby cars');
 for(const timer of timers) timer();
 await previewResult;
 assert(engine.stopped, 'preview engine is cleaned up');
 console.log('Sound button and preview checks passed.');
}).catch(error => {console.error(error); process.exitCode = 1;});
