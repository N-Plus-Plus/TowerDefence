document.addEventListener(`DOMContentLoaded`, function () { onLoad(); } );
document.addEventListener(`visibilitychange`, visibility, false );
window.addEventListener("mousedown", function (e) { clicked( e, true ); mouse.clicked = true; } );
window.addEventListener("mouseup", function (e) { clicked( e, false ); mouse.clicked = false; } );
window.addEventListener(`mousemove`, (e) => { updateMousePos( e ) } );
document.addEventListener("keypress", function(e) { pressed( e ) } );

function visibility() { if( document.visibilityState === "hidden" ){ liveness = false; } else{ liveness = true; } }

if( clientH / ( canvH ) > clientW / canvW ){ scaledUnit = clientW / canvW; }
else{ scaledUnit = ( clientH ) / canvH; }

const mouse = { x: null, y: null, clicked: false }

let loop = setInterval(() => {
    doLoop();
}, frameRate );

function unit( n ){ return n * scaledUnit; }
function deunit( n ){ return n / scaledUnit; }

function onLoad(){
    cacheAssets();
    newLevel( 3 );
}
function finishOnload(){
    if( loaded.done == loaded.of ){
        paintTiles();
        updateDisplay( `coin` );
        updateDisplay( `health` );
        console.log( `done` );
    }
    else{ setTimeout(() => {
        finishOnload();
    }, 10 ); }
}
function enableEditMode( xDim, yDim ){
    game.editing.active = true;
    levelEditor( xDim, yDim );
    renderEditorOptions();
}
function updateMousePos( e ){
    let c = document.querySelector(`#background`).getBoundingClientRect();
    mouse.x = Math.min( Math.max( 0, e.clientX - c.left ), c.right - c.left);
    mouse.y = Math.min( Math.max( 0, e.clientY - c.top ), c.bottom - c.top );
    if( game.editing.active && mouse.clicked ){ addTile(); }
}
function clicked( e, down ){
    if( e.target.id == `towers` ){ // when clicking on the top-most canvas
        if( game.editing.active && down ){     
            renderEditorOptions();
            addTile();
        }
        else if( game.editing.active ){ renderEditorOptions(); }
        else{
            let vX = Math.floor( deunit( mouse.x ) / tileDim );
            let vY = Math.floor( deunit( mouse.y ) / tileDim );
            if( tiles[vY][vX].type == `place` ){
                game.level.selected = { x: vX, y: vY };
                let tow = towers.findIndex( element => element.tileX == vX && element.tileY == vY );
                if( tow == -1 ){ 
                    paintTiles();
                    cleanup( ctxT );
                    paintTowers();
                    renderBuyOptions();
                }
                else{
                    paintTiles();
                    cleanup( ctxT );
                    paintTowers();
                    paintTowerRing( tow );
                    renderUpgradeOptions()
                }
            }
            else{
                game.level.selected = null;
                paintTiles();
                paintTowers();
                renderNoOptions()
            }
        }
    }
    else if( e.target.classList.contains( `buyButton` ) && down ){
        let type = e.target.getAttribute(`buy`);
        buyTower( type );
    }
    else if( e.target.classList.contains( `upgradeButton` ) && down ){
        let t = parseInt( e.target.getAttribute(`upgrade`) );
        let type = e.target.getAttribute(`upgradeType`);
        let max = e.target.getAttribute(`upgradeMax`) == `true`;
        if( !max ){ upgradeTower( t, type ); }
        else{ upgradeTowerMax( t, type ); }
    }
    else if( e.target.classList.contains( `sellButton` ) && down ){
        let t = parseInt( e.target.getAttribute(`sell`) );
        sellTower( t );
    }
    else if( e.target.classList.contains( `playPause` ) && down ){
        togglePause();
    }
    else if( e.target.classList.contains( `skip` ) && down ){
        if( !game.paused && !game.over ){ doSkip(); }
    }
    else if( e.target.classList.contains( `palette` ) ){
        game.editing.tileType = e.target.getAttribute( `palette` );
    }
    else if( e.target.classList.contains( `speed` ) && down ){
        if( game.speed == 1 ){ game.speed = 2; e.target.classList = `img speed speed1`; }
        else if( game.speed == 2 ){ game.speed = 4; e.target.classList = `img speed speed2`; }
        else if( game.speed == 4 ){ game.speed = 1; e.target.classList = `img speed speed0`; }
    }
}
function doLoop(){
    if( !liveness ){}
    else if( game.paused || game.over ){}
    else if( game.editing.active ){}
    else{
        for( let i = 0; i < game.speed; i++ ){
            // make and move mobs
            if( game.waves.countDown > 0 ){ game.waves.countDown--; }
            else{
                if( wave.length == 0 ){ popNextWave(); }
                popMobs( game.waves.count, wave[0] );
                let unspawned = mobs.filter( element => element.countDown > -1 ).length;
                game.waves.countDown = game.vars.waveTime + stat.mobs[mobs[0].type].queue * unspawned;
                wave.shift();
                game.waves.count++;
                updateWaveCount();
            }
            for( m in mobs ){
                if( mobs[m].countDown > 0 ){ mobs[m].countDown--; }
                else if( mobs[m].countDown == 0 && !mobs[m].spawned ){
                    spawnMob( m );
                    mobs[m].countDown = -1; // to be safe                
                }
                else{ moveMob( m ); }
            }
            if( mobs.filter( element => element.countDown > -1 ).length == 0 ){ 
                if( game.autoSkip ){ doSkip(); }
                else{ document.querySelector(`.skip`).classList.remove( `unavailable` ); }
            }
            else{ document.querySelector(`.skip`).classList.add( `unavailable` ); }
        }
        paintMobs();
        moveParticles();
        if( showParticles ){ paintParticles(); }
        // manage towers
        for( let i = 0; i < game.speed; i++ ){
            for( t in towers ){
                if( towers[t].countDown > 0 ){ towers[t].countDown--; }
                else{
                    for( m in mobs ){
                        if( towers[t].countDown > 0 ){ break; }
                        else if( mobs[m].type !== `flying` || stat.towers[towers[t].type].flying ){
                            if( intersect( towers[t].loc.x, towers[t].loc.y, getRange( t ), mobs[m].loc.x, mobs[m].loc.y, scale( unit( mobDim / 3 ) ) ) ){
                                launchParticle( t, m );
                                towers[t].countDown = getRate( t );
                            }
                        }
                    }
                }
            }
            game.ticks++;
            if( game.waves.countDown % ( 100 / frameRate ) == 0 ){
                updateWaveCountdown();
                sortMobs();
            }
        }
    }
}

function pressed( e ){
    console.log( e.key )
    if( e.key == `s` || e.key == `S` ){ doSkip(); }
    else if( e.key == `1` ){ buyTower( `basic` ) }
    else if( e.key == `2` ){ buyTower( `arrow` ) }
    else if( e.key == `3` ){ buyTower( `cannon` ) }
    else if( e.key == ` ` ){ togglePause(); }
}

function togglePause(){
    let e = document.querySelector(`.playPause`);
    if( game.paused ){
        e.classList = `img paused playPause`;
        game.paused = false;
    }
    else{
        e.classList = `img play playPause`;
        game.paused = true;
    }
}

function newLevel( n ){
    // fresh slate
    towers = [];
    mobs = [];
    particles = [];
    wave = [];
    game.over = false;
    game.ticks = 0;
    game.autoSkip = false;
    game.me.health = 20;
    game.me.coin = 100;
    game.level = { selected: null };
    game.waves = { countDown: 0, count: 0, startTick: 0, completed: 0 };
    // retile
    tiles = [];
    for( let y = 0; y < canvH / tileDim; y++ ){
        tiles.push( [] );
        for( let x = 0; x < canvW / tileDim; x++ ){
            tiles[y].push( { 
                tileX: x
                , tileY: y
                , type: null
            } );
        }
    }
    pathFind( n );
    
    fixCanvasDim();

    paintTiles();
    paintMobs();
    paintTowers();
    game.paused = false;
    togglePause();
    if( meta.records[`level${n}`] == undefined ){
        meta.records[`level${n}`] = 0;
    }
    updateWaveCount();
}

function fixCanvasDim(){    
    tileDim = clientW / tiles[0].length;
    if( clientH / tiles.length < tileDim ){ tileDim = clientH / tiles.length; }
    towerDim = 0.8 * tileDim;
    mobDim = 0.5 * tileDim;

    let newH = tileDim * tiles.length;
    canvH = newH;
    let newW = tileDim * tiles[0].length;
    canvW = newW;

    if( clientH / canvH > clientW / canvW ){ scaledUnit = clientW / canvW; }
    else{ scaledUnit = clientH / canvH; }
    
    canvB.height = unit( newH );
    canvB.width = unit( newW );
    canvM.height = unit( newH );
    canvM.width = unit( newW );
    canvT.height = unit( newH );
    canvT.width = unit( newW );
}

function levelEditor( xDim, yDim ){
    tiles = [];
    for( let y = 0; y < yDim; y++ ){
        tiles.push( [] );
        for( let x = 0; x < xDim; x++ ){
            tiles[y].push( { 
                tileX: x
                , tileY: y
                , type: `null`
            } );
        }
    }
    fixCanvasDim();
    paintTiles();
}
function exportLevel(){
    // trim rows    
    for( let y = tiles.length - 1; y >= 0; y-- ){
        if( tiles[y].filter( element => element.type == `null` ).length == tiles[0].length ){
            tiles.splice( y, 1 );
        }
    }
    // trim columns
    let xKill = [];
    for( let i = tiles[0].length - 1; i >= 0; i-- ){
        let empty = 0;
        for( let y = tiles.length - 1; y >= 0; y-- ){
            if( tiles[y][i].type == `null` ){ empty++; }
        }
        if( empty == tiles.length ){ xKill.push(i); }
    }
    for( let y = 0; y < tiles.length; y++ ){
        for( i in xKill ){ tiles[y].splice( xKill[i], 1 ); }
    }
    // add top and bottom rows
    let w = tiles[0].length;
    tiles.unshift( [] );
    tiles.push( [] );
    let n = tiles.length - 1;
    for( let i = 0; i < w; i++ ){
        tiles[0].push( { tileX: 0, tileY: 0, type: `null` } );
        tiles[n].push( { tileX: 0, tileY: 0, type: `null` } );
    }
    for( t in tiles ){
        tiles[t].unshift( { tileX: 0, tileY: 0, type: `null` } );
        tiles[t].push( { tileX: 0, tileY: 0, type: `null` } );
    }
    // fix all coordinates
    for( let y = 0; y < tiles.length; y++ ){
        for( let x = 0; x < tiles[y].length; x++ ){
            tiles[y][x].tileX = x;
            tiles[y][x].tileY = y;
        }
    }
    console.log( JSON.stringify( tiles ) );
}

function paintTiles(){
    cleanup( ctxB );
    let d = unit( tileDim );
    ctxB.lineWidth = 0.5;
    ctxB.strokeStyle = colour.tileSt;
    for( t1 in tiles ){
        for( t2 in tiles[t1] ){
            let type = String( tiles[t1][t2].type );
            if( !game.editing.active ){
                if( game.level.selected !== null ){
                    if( t2 == game.level.selected.x && t1 == game.level.selected.y ){
                        ctxB.drawImage( img.selected, t2 * d, t1 * d, d, d );
                    }
                    else{ ctxB.drawImage( img[type], t2 * d, t1 * d, d, d ); }
                }
                else{ ctxB.drawImage( img[type], t2 * d, t1 * d, d, d ); }
            }
            else{ ctxB.drawImage( img[type], t2 * d, t1 * d, d, d ); }
            ctxB.beginPath();
            ctxB.rect( tiles[t1][t2].tileX * d, tiles[t1][t2].tileY * d, d, d );
            ctxB.stroke();
            ctxB.closePath();
        }
    }
}
function paintMobs(){
    cleanup( ctxM );
    let dim = unit( mobDim );
    for( let m = mobs.length - 1; m >= 0; m-- ){
        if( mobs[m].spawned ){
            ctxM.drawImage( img[mobs[m].type], mobs[m].loc.x - dim / 2, mobs[m].loc.y - dim / 2, dim, dim );
        }
    }
    for( let m = mobs.length - 1; m >= 0; m-- ){
        if( mobs[m].spawned ){
            // empty bar
            ctxM.beginPath();
            ctxM.rect( mobs[m].loc.x - unit( scale( healthWidth ) / 2 ), mobs[m].loc.y - unit( mobDim - scale( healthHeight * 2 ) ), scale( unit( healthWidth ) ), scale( unit( healthHeight ) ) );
            ctxM.fillStyle = colour.emptyHP;
            ctxM.fill();
            ctxM.closePath();
            // health bar
            ctxM.beginPath();
            ctxM.rect( mobs[m].loc.x - unit( scale( healthWidth ) / 2 ), mobs[m].loc.y - unit( mobDim - scale( healthHeight * 2 ) ), scale( unit( healthWidth ) * mobs[m].health / mobs[m].maxHealth ), scale( unit( healthHeight ) ) );
            ctxM.fillStyle = colour.hp;
            ctxM.fill();
            ctxM.closePath();
        }
    }
    for( t in towers ){
        let perc = ( getRate( t ) - towers[t].countDown ) / getRate( t );
        let x = unit( towers[t].tileX * tileDim + tileDim / 2 ) - unit( tileDim ) * perc / 2;
        let y = unit( towers[t].tileY * tileDim );
        ctxM.beginPath();
        ctxM.rect( x, y + unit( tileDim - scale( firingTimerHeight ) ), unit( tileDim * perc ), scale( unit( firingTimerHeight ) ) );
        ctxM.fillStyle = colour.firing;
        ctxM.fill();
        ctxM.closePath();
    }
}

function scale( n ){
    return n * ( tileDim / 100 );
}

function cleanup( ctx ){ ctx.clearRect( 0, 0, unit( canvW ), unit( canvH ) ); }

function pathFind( n ){
    let arr = JSON.parse( jason[n] );
    let start = null;
    let end = null;
    let pathTiles = [];
    let path = [];
    for( y in arr ){
        for( x in arr[y] ){
            if( arr[y][x].type == `start` ){
                start = { x: arr[y][x].tileX, y: arr[y][x].tileY };
                path.push( start );
            }
            else if( arr[y][x].type == `end` ){ 
                end = { x: arr[y][x].tileX, y: arr[y][x].tileY };
                pathTiles.push( end );
            }
            else if( arr[y][x].type == `path` ){
                pathTiles.push( { x: arr[y][x].tileX, y: arr[y][x].tileY, tile: Math.floor( Math.random() * 16 ) } );
            } 
        } 
    }
    tiles = arr;
    let target = start;
    let itt = 0;
    while( itt < 999 && pathTiles.length > 0 ){
        for( p in pathTiles ){
            if( isCardinal( target.x, target.y, pathTiles[p].x, pathTiles[p].y ) ){
                path.push( pathTiles[p] );
                pathTiles.splice( p, 1 );
                target = path[path.length-1];
            }
        }
        itt++;
    }
    game.level.num = n;
    game.level.start = start;
    game.level.end = end;
    game.level.path = path;
}

function isCardinal( x1, y1, x2, y2 ){
    let output = false;
    if( x1 == x2 && y1 == y2 - 1 ){ output = true; }
    else if( x1 == x2 && y1 == y2 + 1 ){ output = true; }
    else if( x1 == x2 - 1 && y1 == y2 ){ output = true; }
    else if( x1 == x2 + 1 && y1 == y2 ){ output = true; }
    return output;
}

function popNextWave(){
    document.querySelector(`.skip`).classList.add( `unavailable` );
    if( game.waves.count < 10 ){ wave = [ `regular`, `regular`, `fast`, `tanky` ]; }
    else{ wave = [ `regular`, `regular`, `fast`, `tanky`, `flying` ]; }
    let tmp = [];
    for( m in stat.mobs ){
        if( stat.mobs[m].from <= game.waves.count && stat.mobs[m].from !== -1 ){ tmp.push( m ); }
    }
    while( wave.length < 9 ){ wave.push( shuffle( tmp )[0] ); }
    wave = shuffle( wave );
    wave.push( `boss` );
    if( ( game.waves.count + 30 ) % 50 == 0 ){ wave[4] = `lucky`; }
}

function popMobs( n, type ){
    let amount = 1;
    if( stat.mobs[type].pack > 1 ){
        amount = stat.mobs[type].pack + Math.floor( game.waves.count / 10 );
    }
    for( let i = 0; i < amount; i++ ){
        mobs.push( {
            type: type
            , countDown: i * stat.mobs[type].queue
            , oldTile: 0
            , newTile: 1
            , loc: { x: null, y: null }
            , spawned: false
            , health: getHealth( type, n )
            , maxHealth: getHealth( type, n )
            , mod: n
            , travelled: 0
        } );
    }
}

function spawnMob( m ){
    let mob = mobs[m];
    mob.spawned = true;
    mob.loc.x = unit( game.level.start.x * tileDim + tileDim / 2 );
    mob.loc.y = unit( game.level.start.y * tileDim + tileDim / 2 );
}

function moveMob( m ){
    let mob = mobs[m];
    let pth = game.level.path;
    let xDir = pth[mob.newTile].x - pth[mob.oldTile].x;
    let yDir = pth[mob.newTile].y - pth[mob.oldTile].y;
    let pthTile = tiles[pth[mob.newTile].y][pth[mob.newTile].x];
    let cease = false;
    if( Math.abs( mob.loc.x - unit( pthTile.tileX * tileDim + tileDim / 2 ) ) < 1 
     && Math.abs( mob.loc.y - unit( pthTile.tileY * tileDim + tileDim / 2 ) ) < 1 ){
        mob.oldTile++;
        mob.newTile++;
        if( mob.newTile == pth.length ){
            dealDamage( m );
            updateDisplay( `health` )
            cease = true;
        }
    }
    if( !cease ){
        xDir = pth[mob.newTile].x - pth[mob.oldTile].x;
        yDir = pth[mob.newTile].y - pth[mob.oldTile].y;
        let moveAmount = scale( stat.mobs[mob.type].speed );
        mob.travelled += moveAmount;
        mob.loc.x += xDir * moveAmount;
        mob.loc.y += yDir * moveAmount;
    }
}

function dealDamage( m ){
    let t = mobs[m].type;
    game.me.health -= stat.mobs[t].damage;    
    if( game.me.health <= 0 ){ 
        game.me.health = 0;
        console.log( `game over` );
        game.over = true;
        game.paused = true;
    }
    else{ removeMob( m ); }
}

function removeMob( m ){
    let kin = mobs.filter( element => element.mod == mobs[m].mod ).length;
    if( kin == 1 ){ game.waves.completed++; }
    if( game.waves.completed > meta.records[`level${game.level.num}`] && !game.over ){
        meta.records[`level${game.level.num}`] = game.waves.completed;
    }
    updateWaveCount();
    mobs.splice( m, 1 );
}

function buildTower( type ){
    if( game.level.selected !== null ){
        towers.push( {
            tileX: game.level.selected.x
            , tileY: game.level.selected.y
            , loc: { x: unit( game.level.selected.x * tileDim + tileDim / 2 ), y: unit( game.level.selected.y * tileDim + tileDim / 2 ) }
            , type: type
            , upgrade: {
                rate: 0
                , damage: 0
                , range: 0
            }
            , countDown: 0
            , investment: stat.towers[type].cost
        } );
    }
}

function launchParticle( t, m ){
    let tow = towers[t].type;
    particles.push( {
        target: {
            x: mobs[m].loc.x
            , y: mobs[m].loc.y
        }
        , loc: {
            x: unit( towers[t].tileX * tileDim + tileDim / 2 )
            , y: unit( towers[t].tileY * tileDim + tileDim / 2 )
        }
        , speed: scale( bulletSpeed )
        , damage: getDamage( t )
        , type: stat.towers[tow].type
        , range: stat.towers[tow].range
        , flying: stat.towers[tow].flying
        , tower: tow
    } );
}

function moveParticles(){
    for( p in particles ){
        let xDiff = particles[p].target.x - particles[p].loc.x;
        let yDiff = particles[p].target.y - particles[p].loc.y;
        let r = xyToR( xDiff, yDiff );
        if( Math.abs( r ) < scale( bulletSpeed ) ){
            if( particles[p].type == `direct` ){
                for( m in mobs ){
                    let b = false;
                    if( intersect( mobs[m].loc.x, mobs[m].loc.y, unit( mobDim ), particles[p].loc.x, particles[p].loc.y, 1 ) ){
                        if( mobs[m].type !== `flying` || particles[p].flying ){
                            hurtMob( p, m );
                            b = true;
                        }
                    }
                    if( b ){ break; }
                }
                particles.splice( p, 1 );
            }
            else if( particles[p].type == `splash` ){
                for( m in mobs ){
                    if( intersect( mobs[m].loc.x, mobs[m].loc.y, unit( mobDim ), particles[p].target.x, particles[p].target.y, unit( tileDim ) ) ){ // todo dynamic splash
                        if( mobs[m].type !== `flying` ){
                            let perc = Math.min( 1, unit( mobDim ) / Math.abs( xyToR( deunit( particles[p].target.x - mobs[m].loc.x ), deunit( particles[p].target.y - mobs[m].loc.y ) ) ) );
                            hurtMob( p, m, perc );
                            // todo make this work properly
                        }
                    }                    
                }
                particles.splice( p, 1 );
            }
        }
        else{
            let angle = Math.atan2( yDiff, xDiff ) + makeRadian( 90 );
            let dist = rToXY( scale( bulletSpeed ), angle );
            particles[p].loc.x += dist.x;
            particles[p].loc.y += -dist.y;
        }
    }
}

function paintParticles(){
    for( p in particles ){
        let tailAngle = Math.atan2( particles[p].target.x - particles[p].loc.x, particles[p].target.y - particles[p].loc.y );
        let tailPlot = rToXY( scale( unit( bulletLength ) ), tailAngle );
        ctxM.beginPath();
        ctxM.moveTo( particles[p].loc.x, particles[p].loc.y );
        ctxM.lineTo( particles[p].loc.x + tailPlot.x, particles[p].loc.y + tailPlot.y );
        ctxM.fillStyle = colour[particles[p].tower];
        ctxM.lineWidth = scale( unit( 2 ) );
        ctxM.strokeStyle = colour[particles[p].tower];
        ctxM.stroke();
        ctxM.closePath();
    }
}

function hurtMob( p, m, perc ){
    let dam = particles[p].damage;
    if( perc !== undefined ){ dam *= perc; }
    mobs[m].health -= dam;
    if( mobs[m].health <= 0 ){
        game.me.coin += getReward( m );
        if( mobs[m].type == `boss` ){ gainDiamond( game.waves.count ); }
        removeMob( m );
        updateDisplay( `coin` );
        updateAffordDisplay();
    }
}

function paintTowers(){
    cleanup( ctxT );
    let dim = unit( tileDim );
    ctxT.strokeStyle = colour.range;
    ctxT.lineWidth = 1;    
    for( t in towers ){ drawTower( towers[t].type, towers[t].loc.x - dim / 2, towers[t].loc.y - dim / 2, ctxT, t ); };
}

function paintTowerRing( t ){
    let til = unit( tileDim / 2 );
    let x = unit( towers[t].tileX * tileDim );
    let y = unit( towers[t].tileY * tileDim );
    ctxT.beginPath();
    ctxT.arc( x + til, y + til, getRange( t ), 0, Math.PI * 2 );
    ctxT.strokeStyle = colour.ring;
    ctxT.stroke();
    ctxT.closePath();
}

function renderBuyOptions(){
    let target = document.querySelector(`#buyPane`);
    target.innerHTML = ``;
    let i = 0;
    for( t in stat.towers ){
        if( stat.towers[t].default || stat.towers[t].unlocked ){
            target.appendChild( buildTowerBuyHTML( t ) );
            i++;
        }
    }
    let divs = document.querySelectorAll(`.bottomBox`);
    for( let j = 0; j < divs.length; j++ ){
        divs[j].style = `width: ${ 100 / i }%;`;
    }
    updateAffordDisplay();
}

function renderEditorOptions(){
    let target = document.querySelector(`#buyPane`);
    target.innerHTML = ``;
    let i = 0;
    for( t in tileTypes ){
        if( tileTypes[t] !== `selected` ){
            target.appendChild( buildEditPalette( t ) );
            i++;
        }
    }
    let divs = document.querySelectorAll(`.bottomBox`);
    for( let j = 0; j < divs.length; j++ ){
        divs[j].style = `width: ${ 100 / i }%;`;
    }
}

function renderUpgradeOptions(){
    let target = document.querySelector(`#buyPane`);
    target.innerHTML = ``;
    let t = towers.findIndex( element => element.tileX == game.level.selected.x && element.tileY == game.level.selected.y );
    let i = 0;
    target.appendChild( buildTowerOverview( t ) );
    for( u in towers[t].upgrade ){
        target.appendChild( buildTowerUpgradeHTML( t, i ) );
        i++;
    }
    let divs = document.querySelectorAll(`.bottomBox`);
    for( let j = 0; j < divs.length; j++ ){
        divs[j].style = `width: ${ 100 / ( i + 1 ) }%;`;
    }
    updateAffordDisplay();
}

function renderNoOptions(){
    document.querySelector(`#buyPane`).innerHTML = ``;    
}

function buildTowerBuyHTML( tower ){
    let p = document.createElement(`div`);
    p.classList = `bottomBox`;
    p.id = `${t}Buy`;
    let p1 = document.createElement(`div`);
    p1.classList = `panelTitle bottomGutter`;
    p1.innerHTML = `${nicify( tower )} Tower`;
    p.appendChild( p1 );
    let p2 = document.createElement(`div`);
    p2.classList = `panelCost bottomGutter`;
    p2.innerHTML = `Cost: <div class="smallImg coin"></div> ${niceNumber( Math.floor( stat.towers[tower].cost * stat.towers[tower].mod ) )}`;
    p.appendChild( p2 );
    let p3 = document.createElement(`div`);
    p3.classList = `buyButton flexy`;
    p3.setAttribute( `buy`, tower );
    p3.innerHTML = `Buy ${nicify( tower )} Tower`;
    p.appendChild( p3 );
    return p;
}

function buildTowerOverview( t ){
    let subj = towers[t].type;
    let p = document.createElement(`div`);
    p.classList = `bottomBox`;
    p.id = `towerSummary`;
    let p1 = document.createElement(`div`);
    p1.classList = `summaryBox`
    let p11 = document.createElement(`div`);
    p11.classList = `towerImg ${subj}`;
    p1.appendChild( p11 );
    let p12 = document.createElement(`div`);
    p12.classList = `towerName`;
    p12.innerHTML = `${nicify( subj )} Tower`;
    p1.appendChild( p12 );
    p.appendChild( p1 );
    let p2 = document.createElement(`div`);
    p2.classList = `panelCost bottomGutter`;
    p2.innerHTML = `Sell: <div class="smallImg coin"></div> ${niceNumber( getSell( t ) )}`;
    p.appendChild( p2 );
    let p3 = document.createElement(`div`);
    p3.classList = `sellButton flexy`;
    p3.setAttribute( `sell`, t );
    p3.innerHTML = `Sell ${nicify( subj )} Tower`;
    p.appendChild( p3 );
    return p;
}

function buildTowerUpgradeHTML( t, i ){
    let subj = Object.keys(towers[t].upgrade)[i];
    let p = document.createElement(`div`);
    p.classList = `bottomBox`;
    p.id = `${subj}Upgrade`;
    let p1 = document.createElement(`div`);
    p1.classList = `panelTitle bottomGutter`;
    let html = `Upgrade ${nicify( subj )}`;
    if( towers[t].upgrade[subj] > 0 ){ html += ` - ${romanize( towers[t].upgrade[subj] )}`; }
    p1.innerHTML = html;
    p.appendChild( p1 );
    if( towers[t].upgrade[subj] >= game.vars.maxUpgrade ){
        let p2 = document.createElement(`div`);
        p2.classList = `panelCost bottomGutter`;
        p2.innerHTML = `Maximum upgrade reached.`;
        p.appendChild( p2 );
    }
    else{
        let p2 = document.createElement(`div`);
        p2.classList = `panelCost bottomGutter`;
        p2.innerHTML = `Cost: <div class="smallImg coin"></div> ${niceNumber( getUpgradeCost( t, subj ) )}`;
        p.appendChild( p2 );
        let p3 = document.createElement(`div`);
        p3.classList = `summaryBox`;    
        let p31 = document.createElement(`div`);
        p31.classList = `upgradeButton flexy`;
        p31.setAttribute( `upgrade`, t );
        p31.setAttribute( `upgradeType`, subj );
        p31.innerHTML = `Buy ${nicify( subj )} Upgrade`;
        let p32 = document.createElement(`div`);
        p32.classList = `upgradeButton max flexy`;
        p32.setAttribute( `upgrade`, t );
        p32.setAttribute( `upgradeType`, subj );
        p32.setAttribute( `upgradeMax`, true );
        p32.innerHTML = `Buy Max`;
        p3.appendChild( p31 );
        p3.appendChild( p32 );
        p.appendChild( p3 );
    }
    return p;
}

function buildEditPalette( t ){
    let q = tileTypes[t];
    let p = document.createElement(`div`);
    p.classList = `bottomBox`;
    p.id = `${q}Paint`;
    let p1 = document.createElement(`div`);
    p1.classList = `palette ${q}`;
    p1.setAttribute( `palette`, q );
    p.appendChild( p1 );
    return p;
}

function addTile(){
    let vX = Math.floor( deunit( mouse.x ) / tileDim );
    let vY = Math.floor( deunit( mouse.y ) / tileDim );
    let t = tiles[vY][vX];
    let rerender = false;
    if( t.type !== game.editing.tileType ){ rerender = true; }
    t.type = game.editing.tileType;
    if( rerender ){ paintTiles(); }
}

function updateAffordDisplay(){
    let n = document.querySelectorAll(`[buy]`);
    for( let i = 0; i < n.length; i++ ){
        let type = n[i].getAttribute(`buy`);
        if( checkAfford( Math.floor( stat.towers[type].cost * stat.towers[type].mod ) ) ){ n[i].classList.remove(`inactive`); }
        else{ n[i].classList.add(`inactive`); }
    }
    n = document.querySelectorAll(`.upgradeButton`);
    for( let i = 0; i < n.length; i++ ){
        let t = parseInt( n[i].getAttribute(`upgrade`) );
        let subj = n[i].getAttribute(`upgradetype`);
        if( checkAfford( getUpgradeCost( t, subj ) ) ){ n[i].classList.remove(`inactive`); }
        else{ n[i].classList.add(`inactive`); }
    }
}
function updateDiamondDisplay(){
    document.querySelector(`#diamond`).innerHTML = niceNumber( meta.me.diamond );
}

function getRange( t ){
    let type = towers[t].type;
    let mod = Math.pow( game.upgrade.range, towers[t].upgrade.range );
    return unit( stat.towers[type].range * rangeMod * tileDim * mod );
}
function getDamage( t ){
    let type = towers[t].type;
    let dmg = stat.towers[type].damage + stat.towers[type].damage * towers[t].upgrade.damage;
    dmg *= Math.pow( game.upgrade.damage, towers[t].upgrade.damage )
    return dmg;
}
function getHealth( type, wave ){
    return stat.mobs[type].health * Math.pow( game.scale.health, wave );
}
function getReward( m ){
    return Math.ceil( stat.mobs[mobs[m].type].reward * Math.pow( game.scale.reward, mobs[m].mod ) / Math.log( game.waves.count + 1 ) );
}
function gainDiamond( w ){
    let amt = Math.floor( w / 10 );
    meta.me.diamond += amt;
    updateDiamondDisplay();
}
function getUpgradeCost( t, subj ){
    let currLevel = towers[t].upgrade[subj];
    let mod = stat.towers[towers[t].type].mod;
    let cost = game.vars.upgradeCost * mod * Math.pow( game.scale[subj], currLevel );
    return Math.floor( cost );
}
function getRate( t ){
    let ranks = towers[t].upgrade.rate;
    let r = stat.towers[towers[t].type].rate * towerDelay * Math.pow( game.upgrade.rate, ranks );
    return r;
}
function getSell( t ){
    return Math.floor( towers[t].investment / 2 );
}

function updateDisplay( q ){
    let target = document.querySelector(`#${q}`);
    target.innerHTML = niceNumber( game.me[q] );
}

function checkAfford( cost ){
    if( cost > game.me.coin ){ return false; }
    else{ return true; }
}

function buyTower( type ){
    if( towers.findIndex( element => element.tileX == game.level.selected.x && element.tileY == game.level.selected.y ) == -1 ){
        let cost = Math.floor( stat.towers[type].cost * stat.towers[type].mod );
        if( checkAfford( cost ) ){
            game.me.coin -= cost;
            buildTower( type );
            paintTowers();
            paintMobs();
            updateDisplay( `coin` );
            paintTowerRing( towers.length - 1 );
            updateAffordDisplay();
            renderUpgradeOptions();
        }
    }
}

function upgradeTower( t, type ){
    let index = towers.findIndex( element => element.tileX == game.level.selected.x && element.tileY == game.level.selected.y );
    if( index !== -1 ){
        if( towers[t].upgrade[type] < game.vars.maxUpgrade ){
            let cost = getUpgradeCost( t, type );
            if( checkAfford( cost ) ){
                game.me.coin -= cost;
                towers[t].upgrade[type]++;
                towers[t].investment += cost;
                paintTowers();
                updateDisplay( `coin` );
                paintTowerRing( index );
                updateAffordDisplay();
                renderUpgradeOptions();
            }
        }
    }
}

function upgradeTowerMax( t, type ){
    while( checkAfford( getUpgradeCost( t, type ) ) && towers[t].upgrade[type] < game.vars.maxUpgrade ){
        upgradeTower( t, type );
    }
}

function sellTower( t ){
    let cost = getSell( t );
    game.me.coin += cost;
    towers.splice( t, 1 );
    paintTowers();
    updateDisplay( `coin` );
    renderBuyOptions();
}

function updateWaveCountdown(){
    let t = document.querySelector(`#waveTimer`);
    let show = Math.ceil( ( game.waves.countDown ) / ( 1000 / frameRate ) );
    if( show == 0 ){ show = Math.ceil( game.waves.countDown / ( 1000 / frameRate ) ) }
    t.innerHTML = show;
}

function updateWaveCount(){
    document.querySelector(`#waveCount`).innerHTML = niceNumber( game.waves.count );
    document.querySelector(`#levelNum`).innerHTML = game.level.num;
    document.querySelector(`#waveRecord`).innerHTML = niceNumber( meta.records[`level${game.level.num}`] );
}

function doSkip(){
    if( mobs.filter( element => element.countDown > -1 ).length == 0 ){
        let reward = Math.ceil( game.waves.countDown / ( 1000 / frameRate ) );
        game.me.coin += reward;
        game.waves.countDown = 0;
        updateWaveCountdown();
        updateAffordDisplay();
        updateDisplay( `coin` );
    }
}

function sortMobs(){
    mobs = mobs.sort( ( a, b ) => ( a.travelled < b.travelled ) ? 1 : ( ( b.travelled < a.travelled) ? -1 : 0 ) );
}

function drawTower( type, x, y, ctx, t ){
    let spokes = stat.towers[type].spokes;
    let sWidth = 2;
    ctx.strokeStyle = colour.tStroke;
    ctx.lineWidth = scale( unit( sWidth ) );
    for( let s = 0; s < spokes; s++ ){
        let angle = makeRadian( 360 / spokes * s );
        if( spokes % 2 !== 0 ){ angle += makeRadian( 180 ); }
        else{ angle += makeRadian( 45 ); }
        let angleDiff = makeRadian( 10 );
        let dist = unit( towerDim ) / 2;
        let buffer = unit( towerDim ) / 4 + unit( sWidth / 2 );
        let perc = towers[t].upgrade[Object.keys(towers[t].upgrade)[s]] / game.vars.maxUpgrade;
        let plotA = rToXY( dist, angle - angleDiff );
        let plotB = rToXY( dist, angle + angleDiff );
        let plotA2 = rToXY( buffer + ( dist - buffer ) * perc, angle - angleDiff );
        let plotB2 = rToXY( buffer + ( dist - buffer ) * perc, angle + angleDiff );
        // spoke fill
        if( perc < 1 ){ ctx.fillStyle = colour.upgrade; }
        else{ ctx.fillStyle = colour.upgraded; }
        ctx.beginPath();
        ctx.moveTo( x + unit( tileDim ) / 2, y + unit( tileDim ) / 2 );
        ctx.lineTo( x + unit( tileDim ) / 2 + plotA2.x, y + unit( tileDim ) / 2 + plotA2.y );
        ctx.lineTo( x + unit( tileDim ) / 2 + plotB2.x, y + unit( tileDim ) / 2 + plotB2.y );
        ctx.lineTo( x + unit( tileDim ) / 2, y + unit( tileDim ) / 2 );
        ctx.fill();
        ctx.closePath();
        // spoke border
        ctx.beginPath();
        ctx.moveTo( x + unit( tileDim ) / 2, y + unit( tileDim ) / 2 );
        ctx.lineTo( x + unit( tileDim ) / 2 + plotA.x, y + unit( tileDim ) / 2 + plotA.y );
        ctx.lineTo( x + unit( tileDim ) / 2 + plotB.x, y + unit( tileDim ) / 2 + plotB.y );
        ctx.lineTo( x + unit( tileDim ) / 2, y + unit( tileDim ) / 2 );
        ctx.stroke();
        ctx.closePath();
    }
    ctx.beginPath();
    ctx.arc( x + unit( tileDim ) / 2, y + unit( tileDim ) / 2, unit( towerDim ) / 4, 0, Math.PI * 2 );
    ctx.fillStyle = colour[type];
    ctx.fill();
    ctx.stroke();
    ctx.closePath();
}


var loaded = { done: 0, of: 6 }
for( key in stat.mobs ){ loaded.of++; }
for( key in stat.towers ){ loaded.of++; }
const img = {};
function cacheAssets(){
    for( m in stat.mobs ){
        img[m] = new Image();
        img[m].src = `./mobs/${m}.png`;
        img[m].onload = function(){ loaded.done++; }
    }
    for( t in stat.towers ){
        img[t] = new Image();
        img[t].src = `./towers/${t}.png`;
        img[t].onload = function(){ loaded.done++; }
    }
    for( a in tileTypes ){
        img[tileTypes[a]] = new Image();
        img[tileTypes[a]].src = `./tiles/${tileTypes[a]}.png`;
        img[tileTypes[a]].onload = function(){ loaded.done++; }
    }
    finishOnload();
}

function intersect( x1, y1, r1, x2, y2, r2 ){
    let squareDistance = ( x1 - x2 ) * ( x1 - x2 ) + ( y1 - y2 ) * ( y1 - y2 );
    return squareDistance <= ( ( r1 + r2 ) * ( r1 + r2 ) );
}

var si = ["","k","M","B","T","q","Q","s","S","O","D"];

function niceNumber( x ){
    let o = ``;
    if( x < 1000 && x > -1000 ){ o = round(x,0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") }
    else{ o = abbrevNum( x ) };
    return o;
}

function abbrevNum(number){
    let neg = false;
    if( number < 0 ){
        neg = true;
        number = Math.abs( number );
    }
    var tier = Math.log10(number) / 3 | 0;
    if(tier == 0) return number;
    var suffix = si[tier];
    var scale = Math.pow(10, tier * 3);
    var scaled = number / scale;
    return ( neg ? `-` : `` ) + scaled.toPrecision(4) + suffix;
}

function round(value, exp) {
    if (typeof exp === 'undefined' || +exp === 0)
    return Math.round(value);  
    value = +value;
    exp = +exp;  
    if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0))
    return NaN;
    value = value.toString().split('e');
    value = Math.round(+(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp)));
    value = value.toString().split('e');
    return +(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp));
}

function titleCase(string) {
    var sentence = string.toString().toLowerCase().split(" ");
    for (var i = 0; i < sentence.length; i++) {
        sentence[i] = sentence[i][0].toString().toUpperCase() + sentence[i].slice(1);
    };
    return sentence;
};

function nicify( x ){
    return String( titleCase((x.replaceAll(`_`,` `) ))).replaceAll(`,`,` `);
}

function romanize (num) {
    if( isNaN(num) )
        return ``;
    var digits = String(+num).split(""),
        key = ["","C","CC","CCC","CD","D","DC","DCC","DCCC","CM",
               "","X","XX","XXX","XL","L","LX","LXX","LXXX","XC",
               "","I","II","III","IV","V","VI","VII","VIII","IX"],
        roman = "",
        i = 3;
    while (i--)
        roman = (key[+digits.pop() + (i * 10)] || "") + roman;
    return Array(+digits.join("") + 1).join("M") + roman;
}

function shuffle( array ) {
    for (let i = array.length - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    };
    return array;
}





function aToR( a ){
    return Math.sqrt( a / Math.PI );
}
function rToC( r ){
    return Math.PI * r;
}
function aToC( a ){
    return 2 * Math.PI * aToR( a );
}

function xyToR( x, y ){
    return Math.sqrt( Math.pow( x, 2 ) + Math.pow( y, 2 ) );
}

function rToXY( r, angle ){
    let x = r * Math.sin(angle);
    let y = r * Math.cos(angle);
    return { x: x, y: y };
}

function intersect( x1, y1, r1, x2, y2, r2 ){
    let squareDistance = ( x1 - x2 ) * ( x1 - x2 ) + ( y1 - y2 ) * ( y1 - y2 );
    return squareDistance <= ( ( r1 + r2 ) * ( r1 + r2 ) );
}

function randBetween( x, y ){
    var delta = y - x + 1;
    var output = Math.floor( Math.random() * delta ) + x;
    return output;
}

function makeRadian( n ){
    return n * ( Math.PI/180 );
}

function makeDegrees( n ){
    return n / ( Math.PI/180 );
}
















/* TODO

UI pause
Split path
support towers and foils to them

tower legs using either bezierCurveTo() or quadraticCurveTo()


*/
/* IDEAS

*/