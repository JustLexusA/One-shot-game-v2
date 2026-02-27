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
let respawnDelay = 1400;
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
  let leftWall = Bodies.rectangle(-40, height/2, 80, height*3, {isStatic:true, label:'wall'});
  let rightWall = Bodies.rectangle(width+40, height/2, 80, height*3, {isStatic:true, label:'wall'});
  World.add(world, [leftWall, rightWall]);

  // Create two stickmen (spawn positions scale with canvas)
  players.push(new Stickman(1, Math.floor(width*0.22), Math.floor(height*0.42), color(0,200,255)));
  players.push(new Stickman(2, Math.floor(width*0.78), Math.floor(height*0.42), color(255,100,100)));

  // setup simple sound synthesizers (p5.sound)
  try{
    jumpOsc = new p5.Oscillator('triangle'); jumpOsc.start(); jumpOsc.amp(0);
    swingOsc = new p5.Oscillator('square'); swingOsc.start(); swingOsc.amp(0);
    hitOsc = new p5.Oscillator('sawtooth'); hitOsc.start(); hitOsc.amp(0);
    pickupOsc = new p5.Oscillator('sine'); pickupOsc.start(); pickupOsc.amp(0);
    deathOsc = new p5.Oscillator('sine'); deathOsc.start(); deathOsc.amp(0);
  }
}