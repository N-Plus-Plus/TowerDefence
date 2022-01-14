const panelHeight = 160;
const clientH = document.body.clientHeight - ( 2 * panelHeight );
const clientW = document.body.clientWidth;
var canvH = 900;
var canvW = 1900;
var tileDim = 100;
var towerDim = 0.8 * tileDim;
var mobDim = 0.5 * tileDim;
const frameRate = 10;
const healthWidth = 50;
const healthHeight = 5;
const firingTimerHeight = 5;
const canvB = document.querySelector(`#background`);
const ctxB = canvB.getContext(`2d`);
const canvM = document.querySelector(`#mobs`);
const ctxM = canvM.getContext(`2d`);
const canvT = document.querySelector(`#towers`);
const ctxT = canvT.getContext(`2d`);

const rangeMod = 2;
const towerDelay = 100;

const bulletSpeed = 25; // todo vary by tower type
const bulletLength = 15; // todo vary by tower type

let tileTypes = [`path`,`null`,`selected`,`place`,`start`,`end`];

const colour = {
    start:      `#060`
    , end:      `#600`
    , path:     `#999`
    , place:    `#666`
    , null:     `#242426`
    , selected: `#079`
    , range:    `#fff3`
    , emptyHP:  `#656D78`
    , hp:       `#F5F7FA`
    , upgrade:  `#3C3B3D99`
    , upgraded: `#3C3B3D`
    , ring:     `#3C3B3D33`
    , firing:   `#F5F7FA33`

    , basic:    `#4FC1E9`
    //, arrow:    `#A0D468`
    , arrow:    `#E8CE4D`
    , cannon:   `#ED5565`
    // , tStroke:  `#F5F7FA`
    , tStroke:  `#3C3B3D`
    
    , tileSt:   `#2223`
}

var liveness = true;
var scaledUnit = null;
var editMode = false;
var showParticles = true;

var towers = [];
var mobs = [];
var tiles = [];
var particles = [];
var wave = [];

var game = {
    ticks: 0
    , paused: false
    , over: false
    , autoSkip: false
    , speed: 1
    , me: {
        health: 20
        , coin: 100
    }
    , level: { selected: null }
    , waves: { countDown: 0, count: 0, startTick: 0, completed: 0 }
    , vars: {
        waveTime: 14990 / frameRate
        , upgradeCost: 75
        , maxUpgrade: 10
    }
    , scale: {
        health: 1.1
        , range: 5 / 4
        , damage: 3 / 2
        , speed: 1.1
        , rate: 4 / 3
        , reward: 1.1
        , pack: 1.1
    }
    , upgrade: {
        rate: 1 / 1.15
        , damage: 1.1
        , range: 1.1
    }
    , editing: { active: false, tileType: null }
}

var meta = {
    me: { diamond: 0 }
    , records: {}
}

var stat = {
    towers: {
        basic:    { default: true, flying: false, range: 1,   damage: 1,    rate: 1,    type: `direct`, cost: 50, spokes: 3, mod: 1 }
        , arrow:  { default: true, flying: true,  range: 1.5, damage: 0.75, rate: 0.75, type: `direct`, cost: 50, spokes: 3, mod: 6 / 5 }
        , cannon: { default: true, flying: false, range: 0.5, damage: 2,    rate: 1.5,  type: `splash`, cost: 50, spokes: 3, mod: 3 / 2, splash: 25 }
        // unlockable
        // , sniper: {}
        // , poison: {}
        // , chill: {}
        // , lightning: {}
        // , fire: {}
    },
    mobs: {
        regular:    { speed: 1,    health: 1,   flying: false, reward: 1,  damage: 1, pack: 6,  queue: 100, from: 0 }
        , tanky:    { speed: 0.5,  health: 1.5, flying: false, reward: 1,  damage: 1, pack: 5,  queue: 100, from: 0 }
        , fast:     { speed: 2,    health: 0.8, flying: false, reward: 1,  damage: 1, pack: 5,  queue: 100, from: 0 }
        , flying:   { speed: 1,    health: 0.3, flying: true,  reward: 1,  damage: 1, pack: 5,  queue: 100, from: 10 }
        , many:     { speed: 1.1,  health: 0.9, flying: true,  reward: 1,  damage: 1, pack: 10, queue: 50,  from: 20 }
        , armoured: { speed: 0.75, health: 1.2, flying: false, reward: 1,  damage: 1, pack: 5,  queue: 100, from: 30 }
        , light:    { speed: 1.25, health: 0.9, flying: false, reward: 1,  damage: 1, pack: 4,  queue: 100, from: 40 }
        , lucky:    { speed: 2.5,  health: 4,   flying: false, reward: 50, damage: 0, pack: 1,  queue: 0,   from: -1 }
        , boss:     { speed: 0.75, health: 7.5, flying: false, reward: 35, damage: 5, pack: 1,  queue: 0,   from: -1 }
    }
}


