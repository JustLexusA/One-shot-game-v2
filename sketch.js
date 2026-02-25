// p5 + Matter.js stickman fighting game
// Controls:
// Left player: A/D move, W jump
// Right player: Left/Right arrows move, Up arrow jump

let Engine = Matter.Engine,
    World = Matter.World,
    Bodies = Matter.Bodies,
    Body = Matter.Body,
    Composite = Matter.Composite,
    Constraint = Matter.Constraint,
    Events = Matter.Events;

let engine, world;
let platforms = [];
let weapons = [];
let players = [];
let scores = [0,0];
let winner = null;
let overlay;
// sound oscillators
let jumpOsc, swingOsc, hitOsc, pickupOsc, deathOsc;

let respawnTimer = 0;
let respawnDelay = 2000;
let respawning = false;

function setup(){
  const cw = Math.min(1200, Math.floor(windowWidth * 0.9));
  const ch = Math.min(720, Math.floor(windowHeight * 0.8));
  const canvas = createCanvas(cw, ch);
  canvas.parent('game');
  engine = Engine.create();
  world = engine.world;
  world.gravity.y = 1.0;
  // create level (platforms, weapons)
  createLevel();

  // add side walls so players don't fall off immediately
  let leftWall = Bodies.rectangle(-40, height/2, 80, height*3, {isStatic:true, label:'wall', color:'red'});
  let rightWall = Bodies.rectangle(width+40, height/2, 80, height*3, {isStatic:true, label:'wall', color:'red'});
  World.add(world, [leftWall, rightWall]);

  // Create two stickmen (spawn positions scale with canvas)
  players.push(new Stickman(1, Math.floor(width*0.22), Math.floor(height*0.42), color(0,200,255)));
  players.push(new Stickman(2, Math.floor(width*0.78), Math.floor(height*0.42), color(255,100,100)));

  // setup simple sound synthesizers (p5.sound)
  // try{
  //   jumpOsc = new p5.Oscillator('triangle'); jumpOsc.start(); jumpOsc.amp(0);
  //   swingOsc = new p5.Oscillator('square'); swingOsc.start(); swingOsc.amp(0);
  //   hitOsc = new p5.Oscillator('sawtooth'); hitOsc.start(); hitOsc.amp(0);
  //   pickupOsc = new p5.Oscillator('sine'); pickupOsc.start(); pickupOsc.amp(0);
  //   deathOsc = new p5.Oscillator('sine'); deathOsc.start(); deathOsc.amp(0);
  // }catch(e){
  //   // p5.sound not available
  // }

  // collision handling for weapon hits
  Events.on(engine,'collisionStart', function(e){
    for(let pair of e.pairs){
      handleCollision(pair.bodyA, pair.bodyB);
    }
  });

  // overlay and restart button
  overlay = select('#overlay');
  select('#restart').mousePressed(()=>{ resetMatch(); hideMenu(); });
}

function draw(){
  background(18);
  Engine.update(engine, 1000/60);

  // draw platforms
  noStroke(); fill(80);
  for(let plat of platforms){ if(plat) drawBody(plat); }

  // draw weapons
  for(let w of weapons) drawWeapon(w);

  // update & draw players
  for(let p of players){
    p.update();
    p.draw();
  }
  // check deaths (fall into void) - handle each death only once
  for(let i=0;i<players.length;i++){
    if(players[i].isDead() && !players[i]._handled){
      // mark handled and remove bodies
      players[i].killBodies();
      players[i]._handled = true;
      let other = players[1-i];
      scores[1-i]++;
      respawning = true;
      respawnTimer = millis();
      if(scores[1-i] >= 5){
        winner = 1-i;
        showMenu(`${other.playerName()} wins!`);
      } else {
        // short delay then respawn
        setTimeout(()=>{ respawnRound(1-i); respawning = false; }, 600);
      }
    }
  }

  // UI
  drawUI();
  updateDOMUI();
}

function drawUI(){
  push();
  fill(220);
  textSize(16);
  textAlign(LEFT,TOP);
  text(`Player 1: ${scores[0]}`, 12, 12);
  textAlign(RIGHT,TOP);
  text(`Player 2: ${scores[1]}`, width-12, 12);
  pop();
}

function updateDOMUI(){
  // scoreboard DOM updates
  let p1 = document.getElementById('points1');
  let p2 = document.getElementById('points2');
  if(p1) p1.textContent = scores[0];
  if(p2) p2.textContent = scores[1];
  // swatches
  let sw1 = document.getElementById('swatch1');
  let sw2 = document.getElementById('swatch2');
  if(sw1 && players[0]) sw1.style.background = `rgb(${players[0].color.levels[0]},${players[0].color.levels[1]},${players[0].color.levels[2]})`;
  if(sw2 && players[1]) sw2.style.background = `rgb(${players[1].color.levels[0]},${players[1].color.levels[1]},${players[1].color.levels[2]})`;
  // weapon status
  let w1 = document.getElementById('weapon1');
  let w2 = document.getElementById('weapon2');
  let held1 = weapons.find(w=> w._attached && w._ownerPlayer===players[0]);
  let held2 = weapons.find(w=> w._attached && w._ownerPlayer===players[1]);
  if(w1) w1.textContent = `Weapon: ${held1? 'Stick' : '—'}`;
  if(w2) w2.textContent = `Weapon: ${held2? 'Stick' : '—'}`;
  // round
  let round = document.getElementById('round');
  if(round) round.textContent = `Round ${scores[0] + scores[1] + 1}`;

  // respawn countdown overlay (small text near center)
  if(respawning){
    let remaining = Math.max(0, Math.ceil((respawnDelay - (millis() - respawnTimer))/1000));
    push();
    textAlign(CENTER, CENTER);
    textSize(22);
    fill(255,220);
    text(`Respawning in ${remaining}s`, width/2, 32);
    pop();
  }
}

function drawBody(b){
  push();
  translate(b.position.x, b.position.y);
  rotate(b.angle);
  rectMode(CENTER);
  rect(0,0, b.bounds.max.x - b.bounds.min.x, b.bounds.max.y - b.bounds.min.y);
  pop();
}

function drawWeapon(w){
  push();
  translate(w.position.x, w.position.y);
  rotate(w.angle);
  rectMode(CENTER);
  fill(180,120,60);
  rect(0,0, 140, 10);
  pop();
}

function handleCollision(a,b){
  // weapon hitting a player's torso/head triggers knockback
  if(a.label==='weapon' && (b.label==='torso' || b.label==='head')){
    applyKnockback(b, a);
  } else if(b.label==='weapon' && (a.label==='torso' || a.label==='head')){
    applyKnockback(a, b);
  }
  // weapon pickup: if a hand collides with weapon, attach
  if(a.label==='hand' && b.label==='weapon') attachWeaponToHand(a,b);
  if(b.label==='hand' && a.label==='weapon') attachWeaponToHand(b,a);
}

function applyKnockback(targetBody, weaponBody){
  // find which player owns target
  for(let p of players){
    if(p.ownsBody(targetBody)){
      // apply a force away from weapon point
      let dir = Matter.Vector.sub(p.torso.position, weaponBody.position);
      let norm = Matter.Vector.normalise(dir);
      let force = Matter.Vector.mult(norm, 0.14 + random(0,0.06));
      Body.applyForce(p.torso, p.torso.position, force);
      // small upward lift
      Body.applyForce(p.torso, p.torso.position, {x:0, y:-0.03});
      // play hit sound
      playHitSound();
    }
  }
}

function attachWeaponToHand(hand, weapon){
  // only attach if free
  if(weapon._attached) return;
  weapon._attached = true;
  weapon._ownerHand = hand;
  // try to find owner player
  weapon._ownerPlayer = null;
  for(let p of players) if(p.ownsBody(hand)) weapon._ownerPlayer = p;
  let cons = Constraint.create({bodyA: hand, pointA:{x:0,y:0}, bodyB:weapon, pointB:{x:0,y:0}, stiffness:0.9, length:0});
  World.add(world, cons);
  weapon._constraint = cons;
  playPickupSound();
}

function detachWeapon(weapon){
  if(!weapon || !weapon._attached) return;
  World.remove(world, weapon._constraint);
  weapon._attached = false;
  weapon._ownerHand = null;
  weapon._ownerPlayer = null;
  weapon._constraint = null;
}

function keyPressed(){
  // optional: drop weapon with shift keys
  if(key==='Shift'){
    for(let w of weapons) if(w._attached) detachWeapon(w);
  }
  // start attack hold for left player (S) or right player (DOWN_ARROW)
  if(key === 's' || key === 'S'){
    if(players[0]) players[0].startAttack();
  }
  if(keyCode === DOWN_ARROW){
    if(players[1]) players[1].startAttack();
  }
  // jump sound triggers on press
  if(key === 'w' || key === 'W') if(players[0]) playJumpSound();
  if(keyCode === UP_ARROW) if(players[1]) playJumpSound();
}

function keyReleased(){
  // left player attack (S)
  if(key === 's' || key === 'S'){
    if(players[0]) players[0].endAttack();
  }
  // right player attack (DOWN)
  if(keyCode === DOWN_ARROW){
    if(players[1]) players[1].endAttack();
  }
}

function respawnRound(winnerIndex){
  // cleanup weapons (drop)
  for(let w of weapons) detachWeapon(w);
  // remove old players' bodies and constraints from world
  for(let p of players){
    try{
      if(p.torso) World.remove(world, p.torso);
      if(p.head) World.remove(world, p.head);
      if(p.leftHand) World.remove(world, p.leftHand);
      if(p.rightHand) World.remove(world, p.rightHand);
      if(p.constraints) for(let c of p.constraints) World.remove(world, c);
    }catch(e){}
  }
  players = [];
  // recreate level (randomized)
  createLevel();
  players.push(new Stickman(1, Math.floor(width*0.22), Math.floor(height*0.42), color(0,200,255)));
  players.push(new Stickman(2, Math.floor(width*0.78), Math.floor(height*0.42), color(255,100,100)));
}

function resetMatch(){
  scores = [0,0];
  winner = null;
  respawnRound();
}

function createLevel(){
  // remove old platforms and weapons
  try{
    for(let p of platforms) World.remove(world, p);
    for(let w of weapons){ if(w._constraint) World.remove(world, w._constraint); World.remove(world, w); }
  }catch(e){}
  platforms = [];
  weapons = [];

  // main platforms (positions scaled to canvas)
  let mid = Bodies.rectangle(width/2, Math.floor(height*0.62), Math.max(220, Math.floor(width*0.42)), 24, {isStatic:true, label:'platform'});
  let left = Bodies.rectangle(Math.floor(width*0.22), Math.floor(height*0.52 + random(-30,30)), 160, 20, {isStatic:true, label:'platform'});
  let right = Bodies.rectangle(Math.floor(width*0.78), Math.floor(height*0.52 + random(-30,30)), 160, 20, {isStatic:true, label:'platform'});
  World.add(world, [mid,left,right]);
  platforms = [mid,left,right];

  // mini platforms below for easier survival
  // more mini platforms below for easier survival
  for(let i=0;i<3;i++){
    let px = Math.floor(width*(0.08 + 0.84*Math.random()));
    let py = Math.floor(height*(0.68 + 0.05*(i%3)));
    let w = 60 + Math.floor(80*Math.random());
    let mini = Bodies.rectangle(px, py, w, 12, {isStatic:true, label:'platform'});
    World.add(world, mini);
    platforms.push(mini);
  }

  // floating platforms above main stage for vertical movement
  for(let i=0;i<4;i++){
    let fx = Math.floor(width*(0.2 + 0.6*Math.random()));
    let fy = Math.floor(height*(0.36 + 0.08*i));
    let fw = 90 + Math.floor(120*Math.random());
    let floatPlat = Bodies.rectangle(fx, fy, fw, 12, {isStatic:true, label:'platform'});
    World.add(world, floatPlat);
    platforms.push(floatPlat);
  }

  // side small platforms near edges
  let sideL = Bodies.rectangle(Math.floor(width*0.06), Math.floor(height*0.5), 90, 12, {isStatic:true, label:'platform'});
  let sideR = Bodies.rectangle(Math.floor(width*0.94), Math.floor(height*0.5), 90, 12, {isStatic:true, label:'platform'});
  World.add(world, [sideL, sideR]);
  platforms.push(sideL, sideR);

  // weapons near center
  let w1 = Bodies.rectangle(width/2 - 70, Math.floor(height*0.54), 140, 10, {label:'weapon', friction:0.3, restitution:0.2});
  let w2 = Bodies.rectangle(width/2 + 70, Math.floor(height*0.54), 140, 10, {label:'weapon', friction:0.3, restitution:0.2});
  World.add(world, [w1,w2]);
  weapons = [w1,w2];
}

function showMenu(text){
  select('#menu-title').html(text || 'Match Over');
  overlay.removeClass('hidden');
}
function hideMenu(){ overlay.addClass('hidden'); }

// Stickman class: simplified ragdoll using torso, head, two hands
class Stickman{
  constructor(id, x, y, col){
    this.id = id;
    this.color = col;
    this.score = 0;
    this.parts = {};
    this.dead = false;

    // torso
    this.torso = Bodies.rectangle(x, y, 20, 48, {label:'torso', friction:0.6, restitution:0.0});
    // head
    this.head = Bodies.circle(x, y-36, 12, {label:'head', friction:0.4, restitution:0.2});
    // hands
    this.leftHand = Bodies.circle(x-18, y, 8, {label:'hand', friction:0.4});
    this.rightHand = Bodies.circle(x+18, y, 8, {label:'hand', friction:0.4});

    // constraints
    let neck = Constraint.create({bodyA:this.torso, pointA:{x:0,y:-20}, bodyB:this.head, pointB:{x:0,y:10}, length:8, stiffness:0.8});
    let leftArm = Constraint.create({bodyA:this.torso, pointA:{x:-12,y:-4}, bodyB:this.leftHand, pointB:{x:0,y:0}, length:26, stiffness:0.7});
    let rightArm = Constraint.create({bodyA:this.torso, pointA:{x:12,y:-4}, bodyB:this.rightHand, pointB:{x:0,y:0}, length:26, stiffness:0.7});

    World.add(world, [this.torso, this.head, this.leftHand, this.rightHand, neck, leftArm, rightArm]);
    this.constraints = [neck, leftArm, rightArm];

    // controls
    this.isLeft = (id===1);
    this.spawnX = x; this.spawnY = y;
    this.lastAttackTime = 0;
    this.attackHoldStart = 0;
    this.attackCooldown = 350; // ms
  }

  update(){
    if(this.dead) return;
    this.handleInput();
    // face direction based on velocity
    this.facing = (this.torso.velocity.x >= 0 ? 1 : -1);
  }

  draw(){
    if(this.dead) return;
    // draw limbs as lines
    strokeWeight(4);
    stroke(this.color);
    // torso - head
    line(this.torso.position.x, this.torso.position.y-8, this.head.position.x, this.head.position.y);
    // arms
    line(this.torso.position.x, this.torso.position.y-4, this.leftHand.position.x, this.leftHand.position.y);
    line(this.torso.position.x, this.torso.position.y-4, this.rightHand.position.x, this.rightHand.position.y);
    // torso vertical
    line(this.torso.position.x, this.torso.position.y-20, this.torso.position.x, this.torso.position.y+20);

    // head
    noStroke(); fill(200);
    ellipse(this.head.position.x, this.head.position.y, 24);

    // draw small circles for hands
    fill(180);
    ellipse(this.leftHand.position.x, this.leftHand.position.y, 14);
    ellipse(this.rightHand.position.x, this.rightHand.position.y, 14);
  }

  handleInput(){
    // apply horizontal forces (tuned lower for smoother movement)
    let forceMag = 0.0032;
    if(this.isLeft){
      if(keyIsDown(65)){ Body.applyForce(this.torso, this.torso.position, {x:-forceMag, y:0}); } // A
      if(keyIsDown(68)){ Body.applyForce(this.torso, this.torso.position, {x:forceMag, y:0}); } // D
      if(keyIsDown(87)){ // W jump (lower)
        if(abs(this.torso.velocity.y) < 2.5){ Body.applyForce(this.torso, this.torso.position, {x:0, y:-0.08}); }
      }
    } else {
      if(keyIsDown(37)){ Body.applyForce(this.torso, this.torso.position, {x:-forceMag, y:0}); } // left
      if(keyIsDown(39)){ Body.applyForce(this.torso, this.torso.position, {x:forceMag, y:0}); } // right
      if(keyIsDown(38)){ if(abs(this.torso.velocity.y) < 2.5) Body.applyForce(this.torso, this.torso.position, {x:0, y:-0.08}); }
    }
  }

  startAttack(){
    this.attackHoldStart = millis();
  }

  endAttack(){
    let dur = millis() - this.attackHoldStart;
    let now = millis();
    if(now - this.lastAttackTime < this.attackCooldown) return; // cooldown
    this.lastAttackTime = now;

    // if long hold, drop weapon (longer threshold)
    if(dur >= 600){
      // drop any attached weapon
      for(let w of weapons) if(w._attached && w._ownerPlayer===this) detachWeapon(w);
      return;
    }

    // short press: if holding weapon, swing; else try pickup nearest
    let held = weapons.find(w=> w._attached && w._ownerPlayer===this);
    if(held){
      // swing: apply force to weapon to create angular velocity and recoil
      let facing = this.facing || (this.isLeft?1:-1);
      let swingForce = 0.11;
      Body.applyForce(held, held.position, {x: facing * swingForce, y: -0.015});
      try{ Body.setAngularVelocity(held, facing * 4); } catch(e){}
      Body.applyForce(this.torso, this.torso.position, {x: -facing*0.015, y:-0.008});
      playSwingSound();
    } else {
      // try to pick up nearest weapon within range of either hand
      let range = 60;
      let candidate = null; let candDist = 1e9; let candHand = null;
      for(let w of weapons){
        if(w._attached) continue;
        let dL = dist(this.leftHand.position.x, this.leftHand.position.y, w.position.x, w.position.y);
        let dR = dist(this.rightHand.position.x, this.rightHand.position.y, w.position.x, w.position.y);
        if(dL < range && dL < candDist){ candDist = dL; candidate = w; candHand = this.leftHand; }
        if(dR < range && dR < candDist){ candDist = dR; candidate = w; candHand = this.rightHand; }
      }
      if(candidate && candHand){ attachWeaponToHand(candHand, candidate); }
    }
  }

  ownsBody(b){
    return b===this.torso || b===this.head || b===this.leftHand || b===this.rightHand;
  }

  isDead(){
    // if torso falls below canvas
    if(this.torso.position.y > height + 90) return true;
    return false;
  }

  killBodies(){
    this.dead = true;
    playDeathSound();
    // keep bodies in world so physics play out, but mark as dead to avoid double scoring
  }

  playerName(){ return this.isLeft ? 'Player 1' : 'Player 2'; }
}

// --- Simple SFX helpers using p5.Oscillator ---
function playTone(osc, freq, vol, dur){
  if(!osc) return;
  try{
    osc.freq(freq);
    osc.amp(vol, 0.005);
    setTimeout(()=>{ try{ osc.amp(0,0.06); }catch(e){} }, dur);
  }catch(e){}
}

function playJumpSound(){ playTone(jumpOsc, 440, 0.25, 120); }
function playSwingSound(){ playTone(swingOsc, 260, 0.28, 160); }
function playHitSound(){ playTone(hitOsc, 160, 0.36, 220); }
function playPickupSound(){ playTone(pickupOsc, 720, 0.18, 120); }
function playDeathSound(){ playTone(deathOsc, 80, 0.5, 420); }
