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
const zapFrames = 5;
const buttonW = 400;
const buttonH = 100;
const canvB = document.querySelector(`#background`);
const ctxB = canvB.getContext(`2d`);
const canvM = document.querySelector(`#mobs`);
const ctxM = canvM.getContext(`2d`);
const canvT = document.querySelector(`#towers`);
const ctxT = canvT.getContext(`2d`);
const canvP = document.querySelector(`#particles`);
const ctxP = canvP.getContext(`2d`);
const canvN = document.querySelector(`#nav`);
const ctxN = canvN.getContext(`2d`);
const canvNB = document.querySelector(`#navBackground`);
const ctxNB = canvNB.getContext(`2d`);
const canvPrev = document.querySelector(`#preview`);
const ctxPrev = canvPrev.getContext(`2d`);
const uiUnit = 4;

const rangeMod = 2;
const towerDelay = 100;

const bulletSpeed = 25; // todo vary by tower type
const bulletLength = 15; // todo vary by tower type

let tileTypes = [`path`,`null`,`selected`,`place`,`start`,`end`];
let buttons = [`New Game`,`Upgrades`,`Information`,`Settings`];
let resetCharge = [];

const colour = {
    range:    `#fff3`
    , emptyHP:  `#656D78`
    , hp:       `#F5F7FA`
    , upgrade:  `#3C3B3D99`
    , upgraded: `#3C3B3D`
    , ring:     `#3C3B3D33`
    , firing:   `#F5F7FA33`

    , regular:  `#EC87C0`,  basic:      `#EC87C0`,  basicDark:  `#e56dad`
    , flying:   `#E8CE4D`,  arrow:      `#E8CE4D`,  arrowDark:  `#ffbe3e`
    , tanky:    `#ED5565`,  cannon:     `#ED5565`,  cannonDark: `#e63e4d`
    , fast:     `#5D9CEC`,  freeze:     `#5D9CEC`,  freezeDark: `#4584e5`
    , armoured: `#FC6E51`,  fire:       `#FC6E51`,  fireDark:   `#fb553b`
    , many:     `#8067B7`,  blast:      `#8067B7`,  blastDark:  `#664fa2`
    , boss:     `#48CFAD`,  sniper:     `#48CFAD`,  sniperDark: `#33bf97`
    , light:    `#4FC1E9`,  lightning:  `#4FC1E9`,  lightningDark: `#39aee1`
    , lucky:    `#A0D468`,  stun:       `#A0D468`,  stunDark:   `#88c64f`
                         ,  support:    `#A0CECB`

    , tStroke:  `#3C3B3D`
    , tileSt:   `#2223`
    , blank:    `#373638`
    , dark:     `#1d1d1e`
    
    , uiElem:   `#A0CECB`

    , locked:   `#ED5565`
    , unlocked: `#48CFAD`
    , text:     `#F5F7FA`
    , modal:    `#1d1d1e99`
}

var liveness = true;
var scaledUnit = null;
var editMode = false;
var showParticles = true;

var towers = [];
var mobs = [];
var tiles = [];
var particles = [];
var zaps = [];
var wave = [];
var navButtons = [];
var levelSelect = [];

var game = {
    ticks: 0
    , paused: false
    , over: false
    , autoSkip: false
    , speed: 1
    , mode: `nav`
    , me: {
        health: 20
        , coin: 100
        , towerCost: 50
    }
    , level: { selected: null }
    , waves: { countDown: 0, count: 0, startTick: 0, completed: 0 }
    , vars: {
        waveTime: 14990 / frameRate
        , upgradeCost: 75
        , maxUpgrade: 10
    }
    , scale: {
        health: 10 / 9
        , range: 5 / 4
        , damage: 3 / 2
        , speed: 10 / 9
        , rate: 4 / 3
        , reward: 10 / 9
        , pack: 10 / 9
        , splash: 3 / 2
        , amount: 4 / 3
        , duration: 6 / 5
        , chance: 5 / 4
        , charge: 3 / 2
        , shots: 10 / 9 // needs to be addative
    }
    , upgrade: {
        rate: 1 / 1.15
        , damage: 1.1
        , range: 1.1
        , splash: 1.15
        , amount: 1 / 1.075
        , duration: 1.25
        , chance: 1.15
        , charge: 1.2
        , shots: 1.1 // needs to be addative
    }
    , editing: { active: false, tileType: null }
}

var meta = {
    me: { diamond: 0 }
    , records: {}
    , upgrades: {
        me: { // 28
            startHearts: { owned: 0, max: 4, benefit: 5 }
            , startCash: { owned: 0, max: 4, benefit: 25 }
            , lucky: { owned: 0, max: 4, benefit: 1 }
            , cashEarned: { owned: 0, max: 4, benefit: 0.2 }
            , interest: { owned: 0, max: 4, benefit: 0.01 }
            , speedControls: { owned: 0, max: 2, benefit: 1 }
            , skipControl: { owned: 0, max: 1, benefit: 1 }
            , wavePreview: { owned: 0, max: 1, benefit: 1 }
            , skipBonus: { owned: 0, max: 4, benefit: 0.5 }
        }
    }
    , unlocks: []
}

var stat = {
    towers: {
        basic:      { default: true,  flying: false, range: 1,    damage: 1,     rate: 1,    type: `direct`,   cat: `damage`,   mod: 1,     upg: [`rate`,`damage`,`range`] }
        , arrow:    { default: true,  flying: true,  range: 1.5,  damage: 0.75,  rate: 0.75, type: `direct`,   cat: `damage`,   mod: 6 / 5, upg: [`rate`,`damage`,`range`] }
        , cannon:   { default: true,  flying: false, range: 0.75, damage: 1.75,  rate: 1.5,  type: `splash`,   cat: `damage`,   mod: 3 / 2, upg: [`rate`,`damage`,`range`,`splash`], splash: 0.25 }
        // unlockable
        , sniper:   { default: true, flying: true,  range: 2.5,  damage: 3,     rate: 6,    type: `direct`,   cat: `damage`,   mod: 4 / 3, upg: [`rate`,`damage`,`range`] }
        , freeze:   { default: true, flying: false, range: 0.5,  damage: 0,     rate: 1.25, type: `slow`,     cat: `support`,   mod: 5 / 4, upg: [`range`,`amount`,`duration`], amount: 0.75, duration: 50 }
        , fire:     { default: true, flying: true,  range: 0.75, damage: 0.005, rate: 1.5,  type: `burn`,     cat: `damage`,   mod: 5 / 4, upg: [`rate`,`damage`,`range`,`duration`], duration: 201 }
        , stun:     { default: true, flying: false, range: 0.75, damage: 0,     rate: 2,    type: `stun`,     cat: `support`,   mod: 3 / 2, upg: [`rate`,`chance`,`range`,`duration`], chance: 0.1, duration: 50 }
        , lightning:{ default: true, flying: false, range: 1.25, damage: 0.5,   rate: 1.75, type: `electric`, cat: `damage`,   mod: 4 / 3, upg: [`rate`,`damage`,`range`,`charge`] }
        , blast:    { default: true, flying: false, range: 0.75, damage: 0.75,  rate: 1.5,  type: `direct`,   cat: `damage`,   mod: 6 / 5, upg: [`rate`,`damage`,`range`,`shots`], shots: 1 }
        // , sniper:   { default: false, flying: true,  range: 2.5,  damage: 3,     rate: 6,    type: `direct`,   cat: `damage`,   mod: 4 / 3, upg: [`rate`,`damage`,`range`] }
        // , freeze:   { default: false, flying: false, range: 0.5,  damage: 0,     rate: 1.25, type: `slow`,     cat: `support`,   mod: 5 / 4, upg: [`range`,`amount`,`duration`], amount: 0.75, duration: 50 }
        // , fire:     { default: false, flying: true,  range: 0.75, damage: 0.005, rate: 1.5,  type: `burn`,     cat: `damage`,   mod: 5 / 4, upg: [`rate`,`damage`,`range`,`duration`], duration: 201 }
        // , stun:     { default: false, flying: false, range: 0.75, damage: 0,     rate: 2,    type: `stun`,     cat: `support`,   mod: 3 / 2, upg: [`rate`,`chance`,`range`,`duration`], chance: 0.1, duration: 50 }
        // , lightning:{ default: false, flying: false, range: 1.25, damage: 0.5,   rate: 1.75, type: `electric`, cat: `damage`,   mod: 4 / 3, upg: [`rate`,`damage`,`range`,`charge`] }
        // , blast:    { default: false, flying: false, range: 0.75, damage: 0.75,  rate: 1.5,  type: `direct`,   cat: `damage`,   mod: 6 / 5, upg: [`rate`,`damage`,`range`,`shots`], shots: 1 }
        //, support:  { default: false, flying: false, range: 0.5,  damage: 0,    rate: 5,    type: `support`,  spokes: 4, mod: 5 / 2 }

        /*
        Caltrop - Damage and slow, build up over time but drop slowly
        Minigun - Spiral of bullets that hit or they don't
        Poison - some fun interaction with Burning ?
        Necro - raise dead in range to fight oncoming --> range, power, 
        Laser - Shoots everything within range, damage divided among them (however many there are)
        Debuff - Take more damage within the range, the closer the more amplified
        */
    },
    mobs: {
        regular:    { speed: 1,    health: 1,   flying: false, reward: 1,  damage: 1, pack: 6,  queue: 100, from: 0 }
        , tanky:    { speed: 0.5,  health: 1.5, flying: false, reward: 1,  damage: 1, pack: 5,  queue: 100, from: 0 }
        , fast:     { speed: 2,    health: 0.7, flying: false, reward: 1,  damage: 1, pack: 5,  queue: 100, from: 0 }
        , flying:   { speed: 1,    health: 0.3, flying: true,  reward: 1,  damage: 1, pack: 5,  queue: 100, from: 10 }
        , many:     { speed: 1.1,  health: 0.9, flying: true,  reward: 1,  damage: 1, pack: 10, queue: 50,  from: 20 }
        , armoured: { speed: 0.75, health: 1.2, flying: false, reward: 1,  damage: 1, pack: 5,  queue: 100, from: 30 }
        , light:    { speed: 1.25, health: 0.9, flying: false, reward: 1,  damage: 1, pack: 4,  queue: 100, from: 40 }
        , lucky:    { speed: 2.5,  health: 4,   flying: false, reward: 50, damage: 0, pack: 1,  queue: 0,   from: -1 }
        , boss:     { speed: 0.75, health: 7.5, flying: false, reward: 35, damage: 5, pack: 1,  queue: 0,   from: -1 }
    }
}