'use strict';
// Local recordings for shoes and engines; see assets/audio/CREDITS.md.
globalThis.cityAudio = (() => {
  let context, master, scene, noise, steps, engineBuffer, muted = false, paused = false;
  let lastStep = -1;
  let foot = 1, stride = 0, birdTimer = 2, hornTimer = 5, bumpTimer = 0;
  const vehicleVolume = .25;
  const engines = new Map();
  const gunBuffers = new Map();
  const gunProfiles = {
    pistol: {duration:.32, body:155, decay:.045, crack:.8, metal:2100, level:.65},
    rifle: {duration:.65, body:95, decay:.085, crack:1, metal:1700, level:.8},
    ak: {duration:.26, body:125, decay:.045, crack:.9, metal:2600, level:.58},
    minigun: {duration:.16, body:185, decay:.025, crack:.7, metal:3200, level:.38}
  };
  const button = document.getElementById('sound');
  try { muted = localStorage.getItem('asfalt-muted') === 'true'; } catch {}
  const label = () => {
    button.textContent = muted ? 'Zvuk: vypnutý' : context?.state === 'running' ? 'Zvuk: zapnutý' : 'Zapnout zvuk';
    button.setAttribute('aria-pressed', String(!muted && context?.state === 'running'));
    button.setAttribute('aria-label', muted || context?.state !== 'running' ? 'Zapnout zvuk' : 'Vypnout zvuk');
  };
  label();
  const smooth = (param, value, speed = .08) => param.setTargetAtTime(value, context.currentTime, speed);
  function unlock() {
    if (muted) return Promise.resolve();
    const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Audio) { button.textContent = 'Zvuk nedostupný'; button.disabled = true; return Promise.resolve(); }
    if (!context) {
      context = new Audio();
      master = context.createGain(); master.gain.value = .55;
      const limiter = context.createDynamicsCompressor();
      master.connect(limiter); limiter.connect(context.destination);
      scene = context.createGain(); scene.gain.value = paused ? 0 : 1; scene.connect(master);
      noise = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      steps = Array.from({length: 6}, (_,i) => recording('concrete-step-' + i));
      engineBuffer = recording('engine-recorded');
    }
    if (context.state !== 'running') return context.resume().then(label).catch(() => { button.textContent = 'Klikni pro zapnutí zvuku'; });
    label(); return Promise.resolve();
  }
  // Each short sound disconnects its whole graph when finished.
  function effect(frequency, end, duration, volume, pan = 0, noisy = false, ui = false, delay = 0) {
    if (!context || context.state !== 'running' || muted || (paused && !ui)) return;
    const source = noisy ? context.createBufferSource() : context.createOscillator();
    const filter = context.createBiquadFilter(), gain = context.createGain();
    const stereo = context.createStereoPanner();
    const now = context.currentTime + delay;
    if (noisy) { source.buffer = noise; filter.type = 'lowpass'; filter.frequency.value = frequency; }
    else { filter.frequency.value = 12000; source.type = 'sine'; source.frequency.setValueAtTime(frequency, now); source.frequency.exponentialRampToValueAtTime(end, now + duration); }
    stereo.pan.value = Math.max(-1, Math.min(1, pan));
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    source.connect(filter); filter.connect(gain); gain.connect(stereo); stereo.connect(ui ? master : scene);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); stereo.disconnect(); };
    source.start(now, noisy ? Math.random() : 0); source.stop(now + duration + .02);
  }
  function recording(name) {
    const sample = globalThis.cityAudioSamples[name];
    const bytes = atob(sample.pcm), buffer = context.createBuffer(1, bytes.length / 2, sample.rate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const value = bytes.charCodeAt(i * 2) | bytes.charCodeAt(i * 2 + 1) << 8;
      data[i] = (value >= 32768 ? value - 65536 : value) / 32768;
    }
    return buffer;
  }
  function footstep(volume, pan, running = false, ui = false) {
    if (!context || context.state !== 'running' || muted || (paused && !ui)) return;
    const source = context.createBufferSource(), gain = context.createGain(), stereo = context.createStereoPanner();
    const lowCut = context.createBiquadFilter(), highCut = context.createBiquadFilter();
    // Keep the dry sole contact; remove heavy thumps and soften sharp clicks.
    lowCut.type = 'highpass'; lowCut.frequency.value = 260;
    highCut.type = 'lowpass'; highCut.frequency.value = 3800;
    lastStep = (lastStep + 1 + Math.floor(Math.random() * (steps.length - 1))) % steps.length;
    source.buffer = steps[lastStep];
    source.playbackRate.value = (running ? 1.14 : 1.06) * (.985 + Math.random() * .03);
    const now = context.currentTime, level = .4 * volume * (.95 + Math.random() * .1);
    // A short natural decay avoids a lingering, cavernous footfall.
    gain.gain.setValueAtTime(level, now);
    gain.gain.setValueAtTime(level, now + .08);
    gain.gain.exponentialRampToValueAtTime(.0001, now + .22);
    stereo.pan.value = pan * .6;
    source.connect(lowCut); lowCut.connect(highCut); highCut.connect(gain); gain.connect(stereo); stereo.connect(ui ? master : scene);
    source.onended = () => { source.disconnect(); lowCut.disconnect(); highCut.disconnect(); gain.disconnect(); stereo.disconnect(); };
    source.start(now); source.stop(now + .23);
  }
  function createEngine(car, preview = false) {
    const filter = context.createBiquadFilter(), gain = context.createGain(), pan = context.createStereoPanner();
    filter.type = 'lowpass'; filter.frequency.value = 1400;
    gain.gain.value = 0; filter.connect(gain); gain.connect(pan); pan.connect(preview ? master : scene);
    const heavy = /Transit|Defender/.test(car.name || '');
    const source = context.createBufferSource(); source.buffer = engineBuffer; source.loop = true;
    source.connect(filter); source.start(0, Math.random() * engineBuffer.duration);
    return {source, filter, gain, pan, previousSpeed: car.speed, load: 0, base: heavy ? .78 : /Porsche|BMW/.test(car.name || '') ? 1.02 : .9,
      stop() { source.stop(); source.disconnect(); filter.disconnect(); gain.disconnect(); pan.disconnect(); }};
  }
  function position(actor, player, range) {
    const dx = actor.x - player.x, dy = actor.y - player.y, distance = Math.hypot(dx, dy);
    return {volume: Math.max(0, 1 - distance / range) ** 2,
      pan: (-dx * Math.sin(player.angle) + dy * Math.cos(player.angle)) / Math.max(1, distance)};
  }
  function update(dt, player, cars, pedestrians, moved, running, obstructed) {
    if (!context || context.state !== 'running' || muted || paused) return;
    stride += moved;
    const stepLength = running ? 43 : 38;
    if (moved > 0 && stride >= stepLength) {
      stride %= stepLength;
      foot *= -1;
      footstep(running ? 1.25 : .9, foot * .12, running);
    }
    bumpTimer -= dt;
    if (obstructed && bumpTimer <= 0) { effect(85, 35, .14, .12); bumpTimer = .6; }
    for (const car of cars) {
      if (car.parked) {
        const idleEngine = engines.get(car);
        if (idleEngine) smooth(idleEngine.gain.gain, 0, .12);
        continue;
      }
      let engine = engines.get(car);
      if (!engine) { engine = createEngine(car); engines.set(car, engine); }
      const location = position(car, player, 430);
      const acceleration = (Math.abs(car.speed) - engine.previousSpeed) / Math.max(dt, .001);
      engine.previousSpeed = Math.abs(car.speed);
      engine.load += (Math.max(0, Math.min(1, acceleration / 18)) - engine.load) * (1 - Math.exp(-dt * 5));
      // Upshifts drop the engine pitch; acceleration adds a richer exhaust note.
      const speed = Math.abs(car.speed), gear = speed < 18 ? 0 : speed < 36 ? 1 : 2;
      const revs = engine.base + (car.rpm == null ? speed * .012 - gear * .12 : (car.rpm - 850) / 5650 * .65) + engine.load * .08;
      const flutter = Math.sin(context.currentTime * 7) * .003;
      smooth(engine.source.playbackRate, Math.max(.65, Math.min(1.65, revs + flutter)), .12);
      smooth(engine.filter.frequency, 1600 + speed * 25 + engine.load * 800, .12);
      smooth(engine.gain.gain, vehicleVolume * location.volume * (.23 + speed / 650 + engine.load * .08), .12);
      smooth(engine.pan.pan, location.pan);
      if(car.police&&car.siren&&location.volume>.001){
        engine.sirenTimer=(engine.sirenTimer||0)-dt;
        if(engine.sirenTimer<=0){
          engine.sirenHigh=!engine.sirenHigh;
          effect(engine.sirenHigh?740:520,engine.sirenHigh?620:650,.65,.09*vehicleVolume*location.volume,location.pan);
          engine.sirenTimer=.7;
        }
      }
    }
    // Only the nearest walkers contribute audible footsteps.
    for (const person of pedestrians) {
      const location = position(person, player, 85);
      const beat = Math.floor(person.gait / Math.PI);
      if (location.volume > 0 && person.wait <= 0 && person.audioBeat !== undefined && beat !== person.audioBeat)
        footstep(.35 * location.volume, location.pan);
      person.audioBeat = beat;
    }
    birdTimer -= dt; hornTimer -= dt;
    if (birdTimer <= 0) {
      effect(2100 + Math.random() * 600, 3400, .18, .025, Math.random() * 2 - 1);
      birdTimer = 3 + Math.random() * 6;
    }
    if (hornTimer <= 0) {
      const car = cars.find(c => !c.parked && c.speed < 2 && position(c, player, 180).volume > .15);
      if (car) { const p = position(car, player, 180); effect(370, 365, .3, .09 * vehicleVolume * p.volume, p.pan); effect(465, 460, .3, .06 * vehicleVolume * p.volume, p.pan); }
      hornTimer = 6 + Math.random() * 7;
    }
  }
  function setPaused(value) {
    if (paused === value) return;
    paused = value; stride = 0;
    if (context) {
      smooth(scene.gain, paused ? 0 : 1, .025);
      effect(paused ? 440 : 660, paused ? 260 : 880, .12, .07, 0, false, true);
    }
  }
  button.addEventListener('click', () => {
    muted = !muted && context?.state === 'running';
    try { localStorage.setItem('asfalt-muted', String(muted)); } catch {}
    label(); unlock();
    if (master) smooth(master.gain, muted ? 0 : .55, .025);
  });
  document.addEventListener('pointerdown', e => { if (e?.target !== button && e?.target?.id !== 'sound-test') unlock(); });
  document.addEventListener('keydown', e => { if (e?.target !== button && e?.target?.id !== 'sound-test') unlock(); });
  let previewActive = false;
  const previewButton = document.getElementById('sound-test');
  previewButton.addEventListener('click', async () => {
    if (previewActive) return;
    previewActive = true;
    try {
      muted = false;
      try { localStorage.setItem('asfalt-muted', 'false'); } catch {}
      await unlock();
      if (!context || context.state !== 'running') return;
      smooth(master.gain, .55, .025); label();
      footstep(1, -.12, false, true);
      const engine = createEngine({name: 'Škoda Octavia', speed: 0}, true);
      const now = context.currentTime;
      engine.source.playbackRate.setValueAtTime(.8, now);
      engine.source.playbackRate.exponentialRampToValueAtTime(1.5, now + 1.8);
      engine.gain.gain.setValueAtTime(0, now);
      engine.gain.gain.setTargetAtTime(.32 * vehicleVolume, now + .35, .12);
      engine.gain.gain.setTargetAtTime(0, now + 1.8, .08);
      setTimeout(() => engine.stop(), 2400);
      await new Promise(resolve => setTimeout(resolve, 2500));
    } finally { previewActive = false; }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && context) context.suspend().catch(() => {});
  });
  function carAction(action){
    if(action==='glass'){
      effect(6500,100,.16,.14,0,true);
      effect(8500,100,.24,.055,-.15,true,false,.055);
    }else if(action==='door')effect(900,100,.14,.065,0,true);
    else if(action==='close'){effect(160,65,.1,.08);effect(1200,100,.06,.055,0,true);}
  }
  // Cached procedural reports: sharp muzzle crack, low blast, action and outdoor tail.
  // Several variants avoid a repeating sample during automatic fire.
  function gunBuffer(id) {
    if (gunBuffers.has(id)) return gunBuffers.get(id);
    const p = gunProfiles[id];
    const variants = Array.from({length:4}, () => {
      const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * p.duration), context.sampleRate);
      const data = buffer.getChannelData(0);
      let low = 0, phase = 0, peak = 0;
      for (let i = 0; i < data.length; i++) {
        const t = i / context.sampleRate, white = Math.random() * 2 - 1;
        low += .12 * (white - low);
        phase += 2 * Math.PI * p.body * (1 + 1.8 * Math.exp(-t / .008)) / context.sampleRate;
        const attack = Math.min(1, t / .0007);
        const crack = (white - low) * p.crack * Math.exp(-t / .009);
        const blast = (low * 2.4 + Math.sin(phase) * .25) * Math.exp(-t / p.decay);
        const actionTime = t - .028;
        const action = actionTime > 0 ? (Math.sin(2 * Math.PI * p.metal * actionTime) * .1 + white * .12) * Math.exp(-actionTime / .012) : 0;
        const tail = low * .55 * (1 - Math.exp(-t / .012)) * Math.exp(-t / (p.duration / 5));
        const fade = Math.min(1, (p.duration - t) / .015);
        data[i] = Math.tanh((crack + blast + action + tail) * 1.5) * attack * fade;
        peak = Math.max(peak, Math.abs(data[i]));
      }
      for (let i = 0; i < data.length; i++) data[i] *= .9 / Math.max(.001, peak);
      return buffer;
    });
    gunBuffers.set(id, variants);
    return variants;
  }
  function gunshot(id = 'pistol') {
    if (!context || context.state !== 'running' || muted || paused) return;
    if (!Object.hasOwn(gunProfiles, id)) id = 'pistol';
    const p = gunProfiles[id], variants = gunBuffer(id);
    const source = context.createBufferSource(), gain = context.createGain();
    source.buffer = variants[Math.floor(Math.random() * variants.length)];
    source.playbackRate.value = .97 + Math.random() * .06;
    gain.gain.value = p.level * (.94 + Math.random() * .06);
    source.connect(gain); gain.connect(scene);
    source.onended = () => { source.disconnect(); gain.disconnect(); };
    source.start(context.currentTime);
  }
  return {update, setPaused, carAction, gunshot};
})();
