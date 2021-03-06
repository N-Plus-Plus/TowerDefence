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
    buildMeta();
    game.paused = true;
    // newLevel( 3 );
}
function finishOnload(){
    if( loaded.done == loaded.of && document.readyState === "complete" ){
        if( game.mode == `nav` ){ loadNav(); }
        else{
            paintTiles();
            updateDisplay( `coin` );
            updateDisplay( `health` );
        }
        console.log( `assets loaded` );
    }
    else{ setTimeout(() => {
        finishOnload();
    }, 10 ); }
}
function enableEditMode( xDim, yDim ){
    document.querySelector(`#mainNav`).classList.add(`hidden`);
    document.querySelector(`#level`).classList.remove(`hidden`);    
    game.editing.active = true;
    levelEditor( xDim, yDim );
    renderEditorOptions();
}
function updateMousePos( e ){
    let c = document.querySelector(`#background`).getBoundingClientRect();
    if( game.mode == `nav` || game.mode == `New Game` ){ c = document.querySelector(`#nav`).getBoundingClientRect(); }
    mouse.x = Math.min( Math.max( 0, e.clientX - c.left ), c.right - c.left);
    mouse.y = Math.min( Math.max( 0, e.clientY - c.top ), c.bottom - c.top );
    if( game.mode == `nav` && navButtons.length > 0 ){
        let isHover = false;
        for( b in navButtons ){
            if( buttonHover( navButtons[b], mouse.x, mouse.y ) ){
                highlightNavButton( b );
                document.querySelector(`body`).style.cursor = `pointer`;
                isHover = true;
            }
        }
        if( !isHover ){
            paintNavButtons();
            document.querySelector(`body`).style.cursor = `auto`;
        }
    }
    else if( game.mode == `New Game` ){
        let isHover = false;
        for( l in levelSelect ){
            if( buttonHover( levelSelect[l], mouse.x, mouse.y ) ){
                paintLeftPanel( l );
                document.querySelector(`body`).style.cursor = `pointer`;
                isHover = true;
            }
        }
        if( !isHover ){
            if( mouse.x > clientW / 4 && mouse.y > clientH / 8 * 7 ){
                document.querySelector(`body`).style.cursor = `pointer`;
            }
            else{ document.querySelector(`body`).style.cursor = `auto`; }
        }
    }
    else if( game.editing.active && mouse.clicked ){ addTile(); }
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
    if( game.mode == `nav` && down ){
        clickNav();
    }
    if( game.mode == `New Game` && down ){
        chooseLevel();
    }
    if( game.mode == `over` ){
        loadNav();
    }
}
function doLoop(){
    for( let i = 0; i < game.speed; i++ ){
        if( checkProceed() ){
            // make and move mobs
            if( game.waves.countDown > 0 ){ game.waves.countDown--; }
            else{
                if( wave.length == 0 ){ popNextWave(); }
                popMobs( game.waves.count, wave[0] );
                let unspawned = mobs.filter( element => element.countDown > -1 ).length;
                game.waves.countDown = game.vars.waveTime + stat.mobs[mobs[0].type].queue * ( unspawned - 1 );
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
                else{
                    moveMob( m );
                }
            }
            if( mobs.filter( element => element.countDown > -1 ).length == 0 ){ 
                if( game.autoSkip ){ doSkip(); }
                else{ document.querySelector(`.skip`).classList.remove( `unavailable` ); }
            }
            else{ document.querySelector(`.skip`).classList.add( `unavailable` ); }
        }
        moveParticles();
        // bring out your dead as a last step
        for( m in mobs ){ checkDead( m ); }
    }
    paintMobs();
    if( showParticles ){
        cleanup( ctxP );
        paintParticles();
    }
    // manage towers
    for( let i = 0; i < game.speed; i++ ){
        if( checkProceed() ){
            let repaintTowers = false;
            for( t in towers ){
                if( towers[t].type == `lightning` ){ towers[t].countUp++; }
                if( towers[t].countDown > 0 ){ towers[t].countDown--; }
                else{
                    for( m in mobs ){
                        if( towers[t].countDown > 0 ){ break; }
                        else if( mobs[m].type !== `flying` || stat.towers[towers[t].type].flying ){
                            if( intersect( towers[t].loc.x, towers[t].loc.y, getRange( t ), mobs[m].loc.x, mobs[m].loc.y, scale( unit( mobDim / 3 ) ) ) ){                                
                                if( stat.towers[towers[t].type].cat == `damage` ){
                                    towers[t].angle = Math.atan2( mobs[m].loc.x - towers[t].loc.x, mobs[m].loc.y - towers[t].loc.y );
                                    repaintTowers = true;
                                }
                                let type = stat.towers[towers[t].type].type;
                                if( type == `direct` || type == `splash` ){
                                    launchParticle( t, m );
                                    if( towers[t].type == `blast` ){
                                        if( towers[t].upgrade.shots > 0 ){
                                            blastParticles( t, m );
                                        }
                                    }
                                    towers[t].countDown = getRate( t );
                                }
                                else if( type == `slow` ){
                                    addStatus( `slow`, t, m );
                                }
                                else if( type == `stun` ){
                                    addStatus( `stun`, t, m );
                                    towers[t].countDown = getRate( t );
                                }
                                else if( type == `burn` ){
                                    launchParticle( t, m );
                                    towers[t].countDown = getRate( t );
                                }
                                else if( type == `electric` ){
                                    zapMob( parseInt( m ), t, 1 );
                                    towers[t].countDown = getRate( t );
                                }
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
            if( repaintTowers ){
                cleanup( ctxT );
                paintTowers();
                let tow = towers.findIndex( element => element.tileX == game.level.selected.x && element.tileY == game.level.selected.y );
                if( tow !== -1 ){ paintTowerRing( tow ); }
            }
        }
    }
}

function checkProceed(){
    let o = true;
    if( !liveness ){ o = false; }
    else if( game.paused || game.over ){ o = false; }
    else if( game.editing.active ){ o = false; }
    return o;
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

function loadNav(){
    document.querySelector(`#level`).classList.add(`hidden`);
    document.querySelector(`#mainNav`).classList.remove(`hidden`);
    game.mode = `nav`;
    game.level.selected = null;
    if( clientH / ( canvH ) > clientW / canvW ){ scaledUnit = clientW / canvW; }
    else{ scaledUnit = ( clientH ) / canvH; }
    ctxPrev.clearRect( 0, 0, clientW, clientH );
    ctxN.clearRect( 0, 0, clientW, clientH );
    loadNavTopBar();
    renderNoOptions();
    updateDiamondDisplay();
    updateWavesDisplay();
    game.paused = true;
    canvN.width = clientW;
    canvN.height = clientH;
    canvNB.width = clientW;
    canvNB.height = clientH;
    tileDim = 100;
    remainder = { w: ( clientW / tileDim - Math.floor( clientW / tileDim ) ) * ( tileDim / 2 ), h: ( clientH / tileDim - Math.floor( clientH / tileDim ) ) * ( tileDim / 2 ) }
    for( let y = 0; y < Math.floor( clientH / tileDim ) + 2; y++ ){
        for( let x = 0; x < Math.floor( clientW / tileDim ) + 2; x++ ){
            let drawX = x * tileDim - ( tileDim - remainder.w );
            let drawY = y * tileDim - ( tileDim - remainder.h );
            ctxNB.drawImage( img.null, drawX, drawY, tileDim, tileDim );
        }
    }
    ctxN.font = `${unit( 48 )}px "Berlin Sans FB Demi"`;
    ctxN.textAlign = `Center`
    navButtons = [];
    buildNavButtons();
}

function buildNavButtons(){
    let segment = clientH / ( buttons.length + 1 );
    for( let b = 0; b < buttons.length; b++ ){
        let h0 = segment * ( b + 1 );
        let w0 = clientW / 2 - unit( buttonW ) / 2;
        navButtons.push( generateQuadrilateral( unit( buttonW ), unit( buttonH ), 0.15, 0.05, w0, h0 ) );
    }
    paintNavButtons();
}

function paintNavButtons(){
    canvW = clientW;
    canvH = clientH;
    ctxN.clearRect( 0, 0, clientW, clientH );
    for( let b = 0; b < buttons.length; b++ ){
        ctxN.beginPath();
        ctxN.moveTo( navButtons[b].c0.x, navButtons[b].c0.y );
        ctxN.lineTo( navButtons[b].c1.x, navButtons[b].c1.y );
        ctxN.lineTo( navButtons[b].c2.x, navButtons[b].c2.y );
        ctxN.lineTo( navButtons[b].c3.x, navButtons[b].c3.y );
        ctxN.fillStyle = `#A0CECB`;
        ctxN.fill();
        ctxN.closePath();        
    }
    for( let b = 0; b < buttons.length; b++ ){
        ctxN.fillStyle = `#0e0e0f`;
        ctxN.textAlign = `center`
        ctxN.fillText( buttons[b], clientW / 2, ( navButtons[b].c0.y + navButtons[b].c1.y ) / 2 + unit( 48 * 1.4 ) ) ;
    }
}

function highlightNavButton( butt ){
    paintNavButtons();
    ctxN.beginPath();
    ctxN.moveTo( navButtons[butt].c0.x, navButtons[butt].c0.y );
    ctxN.lineTo( navButtons[butt].c1.x, navButtons[butt].c1.y );
    ctxN.lineTo( navButtons[butt].c2.x, navButtons[butt].c2.y );
    ctxN.lineTo( navButtons[butt].c3.x, navButtons[butt].c3.y );
    ctxN.fillStyle = `#fff`;
    ctxN.fill();
    ctxN.closePath();
    ctxN.fillStyle = `#0e0e0f`;
    ctxN.textAlign = `center`
    ctxN.fillText( buttons[butt], clientW / 2, ( navButtons[butt].c0.y + navButtons[butt].c1.y ) / 2 + unit( 48 * 1.4 ) ) ;
}

function generateQuadrilateral( w, h, variability, error, xOff, yOff ){
    let areaMin = ( w * h ) - ( w * h ) * error / 2;
    let areaMax = ( w * h ) + ( w * h ) * error / 2;
    let o = { c0: { x: null, y: null }, c1: { x: null, y: null }, c2: { x: null, y: null }, c3: { x: null, y: null }, c4: { x: null, y: null } };
    let area = 0;
    let safety = 0;
    while( area < areaMin || area > areaMax || safety < 50 ){
        o.c0.x = 0 + randBetweenPrecise( -w * variability / 2, w * variability / 2 );
        o.c0.y = 0 + randBetweenPrecise( -h * variability / 2, h * variability / 2 );
        o.c1.x = w + randBetweenPrecise( -w * variability / 2, w * variability / 2 );
        o.c1.y = 0 + randBetweenPrecise( -h * variability / 2, h * variability / 2 );
        o.c2.x = w + randBetweenPrecise( -w * variability / 2, w * variability / 2 );
        o.c2.y = h + randBetweenPrecise( -h * variability / 2, h * variability / 2 );
        o.c3.x = 0 + randBetweenPrecise( -w * variability / 2, w * variability / 2 );
        o.c3.y = h + randBetweenPrecise( -h * variability / 2, h * variability / 2 );
        o.c4.x = o.c0.x;
        o.c4.y = o.c0.y;
        let angle = Math.atan2( o.c3.y - o.c1.y, o.c3.x - o.c1.x ) - Math.atan2( o.c2.y - o.c0.y, o.c2.x - o.c0.x );
        area = getArea( xyToR( o.c2.x - o.c0.x, o.c2.y - o.c2.y ), xyToR( o.c3.x - o.c1.x, o.c3.y - o.c1.y ), angle );
        safety++;
    }
    for( n in o ){
        o[n].x += xOff;
        o[n].y += yOff;
    }
    return o;
}

function getArea( d1, d2, angle ){
    return 0.5 * d1 * d2 * Math.sin( angle );
}

function buttonHover( polygon, mouseX, mouseY ){
    let c = false;    
    for( let i = 1, j = 0; i < Object.keys( polygon ).length; i++, j++ ){
        const ix = polygon[`c${i}`].x;
        const iy = polygon[`c${i}`].y;
        const jx = polygon[`c${j}`].x;
        const jy = polygon[`c${j}`].y;
        const iySide = ( iy > mouseY );
        const jySide = ( jy > mouseY );
        if( iySide !== jySide ){
            const intersectX = ( jx - ix ) * ( mouseY - iy ) / ( jy - iy ) + ix;
            if( mouseX < intersectX ){ c = !c; }
        }
    }
    return c;
}

function clickNav(){
    let what = null;
    for( b in navButtons ){
        if( buttonHover( navButtons[b], mouse.x, mouse.y ) ){ what = b; }
    }
    subNav( what );
}
function chooseLevel(){
    let s = game.candidateLevel;
    if( mouse.x > clientW / 4 ){
        if( mouse.y > clientH / 8 * 7 ){
            if( checkLevelLock( s ) ){
                newLevel( parseInt( game.candidateLevel ) );
            }
        }
    }
    // let what = null;
    // for( l in levelSelect ){
    //     if( buttonHover( levelSelect[l], mouse.x, mouse.y ) ){ what = parseInt( b ); }
    // }
    // if( what !== null ){
    //     if( checkLevelLock( game.candidateLevel ) ){
    //         newLevel( parseInt( game.candidateLevel ) );
    //     }
    // }
}

function subNav( b ){
    if( b !== null && b !== undefined ){
        document.querySelector(`body`).style.cursor = `auto`;
        game.mode = buttons[b];
    }
    if( b == 0 ){
        ctxN.clearRect( 0, 0, clientW, clientH );
        paintLevelSelect();
    } // new level
    else if( b == 1 ){ buildUpgradeInterface(); } // Upgrades
    else if( b == 2 ){} // Information
    else if( b == 3 ){} // Settings
}

function buildUpgradeInterface(){

}

function paintLevelSelect( n ){
    if( n == undefined ){ n = 0; }
    let listWidth = clientW / uiUnit;
    let horHeight = clientH / ( uiUnit * 2 );
    // left panel
    ctxN.beginPath();
    ctxN.rect( 0, 0, listWidth, clientH );
    ctxN.fillStyle = colour.blank;
    ctxN.fill();
    ctxN.closePath();
    buildLeftPanel( listWidth / ( uiUnit * 2 ), listWidth );
    paintLeftPanel( n );
    // top bar
    ctxN.beginPath();
    ctxN.rect( listWidth, 0, clientW - listWidth, horHeight );
    ctxN.fillStyle = colour.dark;
    ctxN.fill();
    ctxN.closePath();
    // bottom bar
    ctxN.beginPath();
    ctxN.rect( listWidth, clientH - horHeight, clientW - listWidth, horHeight )
    ctxN.fillStyle = colour.dark;
    ctxN.fill();
    ctxN.closePath();

    // build a list of levels down the left, mouse-over loads a preview on the right, and clicking the level gives the Start button
    if( n !== game.candidateLevel ){
        setCandidateLevel( n );
        paintPreview( n, listWidth, horHeight, clientW - listWidth, clientH - horHeight * 2 );
        paintBars( n, listWidth, horHeight );
    }
}

function buildLeftPanel( pad, width ){
    levelSelect = [];
    let levelCount = jason.length;
    let bHeight = unit( 75 );
    for( let l = 0; l < levelCount; l++ ){
        levelSelect.push( generateQuadrilateral( width - pad * 2, bHeight, 0.1, 0.05, pad, pad + ( pad + bHeight ) * l ) );        
    }
}

function paintLeftPanel( selected ){
    let width = clientW / uiUnit;
    let listWidth = clientW / uiUnit;
    let horHeight = clientH / ( uiUnit * 2 );
    ctxN.clearRect( 0, 0, listWidth, clientH );
    ctxN.beginPath();
    ctxN.rect( 0, 0, listWidth, clientH );
    ctxN.fillStyle = colour.blank;
    ctxN.fill();
    ctxN.closePath();
    for( l in levelSelect ){
        ctxN.beginPath();
        ctxN.moveTo( levelSelect[l].c0.x, levelSelect[l].c0.y );
        ctxN.lineTo( levelSelect[l].c1.x, levelSelect[l].c1.y );
        ctxN.lineTo( levelSelect[l].c2.x, levelSelect[l].c2.y );
        ctxN.lineTo( levelSelect[l].c3.x, levelSelect[l].c3.y );
        ctxN.lineTo( levelSelect[l].c0.x, levelSelect[l].c0.y );
        ctxN.fillStyle = colour.uiElem;
        if( l == selected ){ ctxN.fillStyle = `#fff`; }
        ctxN.fill();
        ctxN.closePath();
        ctxN.fillStyle = `#0e0e0f`;
        ctxN.textAlign = `center`
        ctxN.fillText( `Level ${l}`, width / 2, ( levelSelect[l].c0.y + levelSelect[l].c1.y ) / 2 + unit( 36 * 1.4 ) ) ;
    }
    if( selected !== game.candidateLevel ){
        setCandidateLevel( selected );
        paintPreview( selected, listWidth, horHeight, clientW - listWidth, clientH - horHeight * 2 );
        paintBars( selected, listWidth, horHeight );
    }
}

function setCandidateLevel( n ){
    game.candidateLevel = n;
}

function paintBars( n, xOff, yHeight ){
    let unlock = checkLevelLock( n );
    // cleanup
    ctxN.clearRect( xOff, 0, clientW - xOff, yHeight );
    ctxN.beginPath();
    ctxN.rect( xOff, 0, clientW - xOff, yHeight );
    ctxN.fillStyle = colour.dark;
    ctxN.fill();
    ctxN.closePath();
    ctxN.clearRect( xOff, clientH - yHeight, clientW - xOff, yHeight );
    ctxN.beginPath();
    ctxN.rect( xOff, clientH - yHeight, clientW - xOff, yHeight );
    if( unlock ){ ctxN.fillStyle = colour.unlocked; }
    else{ ctxN.fillStyle = colour.dark; }
    ctxN.fill();
    ctxN.closePath();
    // populate
    let xMid = ( clientW - xOff ) / 2;
    let yBuff = ( yHeight - unit( buttonH * 0.75 ) ) / 2;
    let plot = generateQuadrilateral( unit( buttonW ), unit( buttonH * 0.75 ), 0.1, 0.05, xOff + xMid - unit( buttonW ) / 2, yBuff );
    let verb = `UNLOCKED`;
    if( unlock ){ ctxN.fillStyle = colour.unlocked; }
    else{ ctxN.fillStyle = colour.locked; verb = `LOCKED`; }
    ctxN.beginPath();
    ctxN.moveTo( plot.c0.x, plot.c0.y );
    ctxN.lineTo( plot.c1.x, plot.c1.y );
    ctxN.lineTo( plot.c2.x, plot.c2.y );
    ctxN.lineTo( plot.c3.x, plot.c3.y );
    ctxN.lineTo( plot.c0.x, plot.c0.y );
    ctxN.fill();
    ctxN.closePath();
    ctxN.fillStyle = `#0e0e0f`;
    ctxN.textAlign = `center`;
    ctxN.fillText( verb, xOff + xMid, ( plot.c0.y + plot.c1.y ) / 2 + unit( 36 * 1.5 ) ) ;

    if( unlock ){
        // ctxN.font = `${unit( 48 )}px "Berlin Sans FB Demi"`;
        ctxN.fillStyle = colour.dark;
        ctxN.textAlign = `center`;
        let msg = `Start Level!`;
        ctxN.fillText( msg, xOff + xMid, clientH - yHeight / 3 );
    }
    else{
        // ctxN.font = `${unit( 36 )}px "Berlin Sans FB Demi"`;
        ctxN.fillStyle = colour.text;
        ctxN.textAlign = `center`;
        let msg = `Clear ${niceNumber( meta.unlocks[n] )} waves to unlock.`;
        ctxN.fillText( msg, xOff + xMid, clientH - yHeight / 3 );
    }
}

function checkLevelLock( n ){
    let quota = meta.unlocks[n];
    let w = 0;
    for( l in meta.records ){ w += meta.records[l]; }
    return w >= quota;
}

function paintPreview( l, x, y, w, h ){
    canvPrev.width = clientW;
    canvPrev.height = clientH;
    ctxPrev.clearRect( x, y, w, h );
    // black out prev background
    ctxPrev.beginPath();
    ctxPrev.rect( x, y, w, h );
    ctxPrev.fillStyle = colour.blank;
    ctxPrev.fill();
    ctxPrev.closePath();
    // build preview
    let lev = JSON.parse( jason[l] );
    let d = h / ( lev.length );
    if( w / lev[0].length < d ){ d = w / lev[0].length; }
    let buffer = { x: 0, y: 0 };
    if( Math.abs( w / d - lev[0].length ) > 0.1 ){ buffer.x = w - ( lev[0].length * d ); }
    x += ( buffer.x / 2 );
    if( Math.abs( h / d - lev.length ) > 0.1 ){ buffer.y = h - ( lev.length * d ); }
    y += ( buffer.y / 2 );
    ctxPrev.lineWidth = 0.5;
    ctxPrev.strokeStyle = colour.tileSt;
    for( t1 in lev ){
        for( t2 in lev[t1] ){
            let type = String( lev[t1][t2].type );
            if( !game.editing.active ){
                if( game.level.selected !== null ){
                    if( t2 == game.level.selected.x && t1 == game.level.selected.y ){
                        ctxPrev.drawImage( img.selected, x + t2 * d, y + t1 * d, d, d );
                    }
                    else{ ctxPrev.drawImage( img[type], x + t2 * d, y + t1 * d, d, d ); }
                }
                else{ ctxPrev.drawImage( img[type], x + t2 * d, y + t1 * d, d, d ); }
            }
            else{ ctxPrev.drawImage( img[type], x + t2 * d, y + t1 * d, d, d ); }
            ctxPrev.beginPath();
            ctxPrev.rect( x + lev[t1][t2].tileX * d, y + lev[t1][t2].tileY * d, d, d );
            ctxPrev.stroke();
            ctxPrev.closePath();
        }
    }
}

function iddqd(){
    game.me.health = 1000;
    updateDisplay(`health`);
    game.me.coin = 100000;
    updateDisplay(`coin`);
}

function newLevel( n ){
    game.mode = `play`;
    document.querySelector(`body`).style.cursor = `auto`;
    document.querySelector(`#mainNav`).classList.add(`hidden`);
    document.querySelector(`#level`).classList.remove(`hidden`);
    if( clientH / ( canvH ) > clientW / canvW ){ scaledUnit = clientW / canvW; }
    else{ scaledUnit = ( clientH ) / canvH; }
    loadLevelTopBar();
    // fresh slate
    let slate = [ towers, mobs, zaps, particles, wave ];
    for( s in slate ){ slate[s] = []; }
    game.over = false;
    game.speed = 1;
    game.ticks = 0;
    game.autoSkip = false;
    game.me.health = 10;
    game.me.coin = 100;
    game.level = { selected: null };
    game.waves = { countDown: 0, count: 0, startTick: 0, completed: 0 };
    // retile
    towers = [];
    mobs = [];
    tiles = [];
    particles = [];
    zaps = [];
    wave = [];

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
    updateDisplay( `coin` );
    updateDisplay( `health` );
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
    
    let canvi = [canvB, canvM, canvT, canvP];

    for( n in canvi ){
        canvi[n].height = unit( newH );
        canvi[n].width = unit( newW );
    }
}

function loadLevelTopBar(){
    document.querySelector(`#topPanel`).innerHTML = `<div class="topBox flexy colStack"><div class="flexy left"><div class="img coin"></div><a id="coin">50</a></div><div class="flexy left"><div class="img diamond"></div><a id="diamond">0</a></div></div><div class="topBox flexy colStack"><div class="topStack">Wave: <a id="waveCount">0</a></div><div class="topStack"><div class="img play playPause"></div><div class="timer">Next wave in <a id="waveTimer">0</a> seconds</div><div class="img skip"></div></div><div class="topStack">Level <a id="levelNum"></a> max waves completed: <a id="waveRecord"></a></div></div><div class="topBox flexy colStack"><div class="flexy right"><a id="health">20</a><div class="img heart"></div></div><div class="flexy right"><div class="img speed speed0"></div></div></div>`;
}
function loadNavTopBar(){
    document.querySelector(`#topPanel`).innerHTML = `<div class="topBox flexy colStack"><div class="flexy left"><div class="img diamond"></div><a id="diamond">0</a></div></div><div class="topBox flexy colStack"><div class="logo"></div></div><div class="topBox flexy colStack"><div class="flexy right"><a id="waves">0</a><div class="img wave"></div></div></div>`;
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
    if( Math.floor( Math.random() * 100 ) <= 1 + getBenefit( `me`, `lucky` ) ){
        wave[0] = `lucky`;
        wave = shuffle( wave );
    }
    wave.push( `boss` );
    // if( ( game.waves.count + 30 ) % 50 == 0 ){ wave[4] = `lucky`; }
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
            , status: { stun: [], slow: [], burn: [] }
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
    let moveAmount = scale( stat.mobs[mob.type].speed );
    if( Math.abs( mob.loc.x - unit( pthTile.tileX * tileDim + tileDim / 2 ) ) < moveAmount / 2 
     && Math.abs( mob.loc.y - unit( pthTile.tileY * tileDim + tileDim / 2 ) ) < moveAmount / 2 ){
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
        let moveMod = 1;
        if( mobs[m].status.stun.length > 0 ){ moveMod = 0; }
        else if( mobs[m].status.slow.length > 0 ){
            for( s in mobs[m].status.slow ){
                if( mobs[m].status.slow[s].amount < moveMod ){
                    moveMod = mobs[m].status.slow[s].amount; 
                }
            }
        }
        mob.travelled += moveAmount * moveMod;
        mob.loc.x += xDir * moveAmount * moveMod;
        mob.loc.y += yDir * moveAmount * moveMod;
        doCountDown( m );
        doDot( m );
        doResets();
    }
}

function doCountDown( m ){
    for( s in mobs[m].status ){
        for( ss in mobs[m].status[s] ){
            mobs[m].status[s][ss].countDown--;
            if( mobs[m].status[s][ss].countDown == 0 ){
                mobs[m].status[s].splice( ss, 1 );
            }
        }
    }
}

function doDot( m ){
    let mob = mobs[m];
    for( dot in mob.status.burn ){
        harmMob( m, mob.status.burn[dot].perTick );
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
        gameOverStamp();
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
            , upgrade: {}
            , countDown: 0
            , investment: Math.floor( game.me.towerCost * stat.towers[type].mod )
            , angle: makeRadian( 90 )
        } );
        for( u in stat.towers[type].upg ){
            let key = stat.towers[type].upg[u];
            towers[towers.length-1].upgrade[key] = 0;
        }
        if( type == `lightning` ){ towers[towers.length-1].countUp = -getRate( towers.length - 1 ); }
    }
}

function launchParticle( t, m, x, y ){
    let tow = towers[t].type;
    if( m !== null ){ x = mobs[m].loc.x; y = mobs[m].loc.y; }
    particles.push( {
        target: { x: x, y: y }
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
        , source: t
    } );
}

function blastParticles( t, m ){
    let startAngle = Math.atan2( mobs[m].loc.x - towers[t].loc.x, mobs[m].loc.y - towers[t].loc.y );
    let incrAngle = makeRadian( 360 ) / ( towers[t].upgrade.shots + 1 );
    let r = getRange( t );
    for( let i = 1; i < towers[t].upgrade.shots + 1; i++ ){
        let xy = rToXY( r, startAngle + incrAngle * i );
        launchParticle( t, null, towers[t].loc.x + xy.x, towers[t].loc.y + xy.y );
    }
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
            else if( particles[p].type == `burn` ){
                for( m in mobs ){
                    let b = false;
                    if( intersect( mobs[m].loc.x, mobs[m].loc.y, unit( mobDim ), particles[p].loc.x, particles[p].loc.y, 1 ) ){
                        if( mobs[m].type !== `flying` || particles[p].flying ){
                            addStatus( `burn`, particles[p].source, m );
                            b = true;
                        }
                    }
                    if( b ){ break; }
                }
                particles.splice( p, 1 );
            }
            else if( particles[p].type == `splash` ){
                for( m in mobs ){
                    let radius = getSplash( particles[p].source );
                    if( intersect( mobs[m].loc.x, mobs[m].loc.y, unit( mobDim ), particles[p].target.x, particles[p].target.y, radius ) ){
                        if( mobs[m].type !== `flying` ){
                            let perc = Math.min( 1, radius / Math.abs( xyToR( deunit( particles[p].target.x - mobs[m].loc.x ), deunit( particles[p].target.y - mobs[m].loc.y ) ) ) );
                            hurtMob( p, m, perc );
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
        ctxP.beginPath();
        ctxP.moveTo( particles[p].loc.x, particles[p].loc.y );
        ctxP.lineTo( particles[p].loc.x + tailPlot.x, particles[p].loc.y + tailPlot.y );
        ctxP.fillStyle = colour[particles[p].tower];
        ctxP.lineWidth = scale( unit( 2 ) );
        ctxP.strokeStyle = colour[particles[p].tower];
        ctxP.stroke();
        ctxP.closePath();
    }
    ctxP.lineWidth = scale( 1 );
    ctxP.strokeStyle = colour.lightning;
    for( let z = zaps.length - 1; z >= 0; z-- ){
        ctxP.beginPath();
        ctxP.moveTo( zaps[z].fromX, zaps[z].fromY );
        ctxP.lineTo( zaps[z].toX, zaps[z].toY );
        ctxP.stroke();
        ctxP.closePath();
        zaps[z].countDown--;
        if( zaps[z].countDown == 0 ){ zaps.splice( z, 1 ); }
    }
}

function addStatus( status, t, m ){
    let mob = mobs[m];
    let tower = towers[t];
    let index = null;
    // HANDLE SLOW
    // check for identical slow
    if( status == `slow` && mob.status.slow.findIndex( element => element.amount == getAmount( t ) ) !== -1 ){ 
        index = mob.status.slow.findIndex( element => element.amount == getAmount( t ) );
    }
    // add new if applicable
    if( status == `slow` && index == null ){
        mob.status.slow.push( { countDown: getDuration( t ), amount: getAmount( t ) } );
    }
    // replenish clock otherwise
    else if( status == `slow` ){
        if( mob.status.slow[index].countDown < getDuration( t ) ){
            mob.status.slow[index].countDown = getDuration( t );
        }
    }
    // HANDLE STUN
    if( status == `stun` && Math.random() < getChance( t ) ){
        mob.status.stun.push( { countDown: getDuration( t ) } );
    }
    // HANDLE BURN
    if( status == `burn` ){
        mob.status.burn.push( { countDown: getDuration( t ), perTick: getDamage( t ) } );
    }


    /* status = {
        stun: { countDown: 0, procOn: 0 }
        , chill: { countDown: 0, amount: 0 }
        , burn: { countDown: 0, damage: 0, procOn: null }
    }
    */
}

function hurtMob( p, m, perc ){
    let dam = particles[p].damage;
    if( perc !== undefined ){ dam *= perc; }
    mobs[m].health -= dam;    
}

function harmMob( m, amt ){
    mobs[m].health -= amt;
}

function zapMob( m, t, n ){
    let chargeBoost = Math.log( Math.pow( Math.max( 2, towers[t].countUp ), towers[t].upgrade.charge + 1 ) );
    if( showParticles ){
        if( n == 1 ){
            for( let i = 0; i < chargeBoost; i++ ){
                zaps.push( { fromX: towers[t].loc.x, fromY: towers[t].loc.y, toX: mobs[m].loc.x + getZapOffset(), toY: mobs[m].loc.y + getZapOffset(), countDown: zapFrames } );
            }
        }
        // draw lightning
    }
    let impedance = Math.pow( n, 1.25 );
    let dam = getDamage( t ) * chargeBoost / impedance;
    mobs[m].health -= dam;
    // find next and zap them
    let r = tileDim / 1.75;
    if( mobs[m].loc.x == null || m + 1 == mobs.length ){ resetCharge.push( t ); }
    else if( intersect( mobs[m].loc.x, mobs[m].loc.y, r, mobs[m+1].loc.x, mobs[m+1].loc.y, r ) ){
        zapMob( m+1, t, n+1 );
        zaps.push( { fromX: mobs[m].loc.x, fromY: mobs[m].loc.y, toX: mobs[m+1].loc.x + getZapOffset(), toY: mobs[m+1].loc.y + getZapOffset(), countDown: zapFrames } );
    }
    else{ resetCharge.push( t ); }
}

function getZapOffset(){
    return scale( mobDim * ( Math.random() - 0.5 ) );
}

function doResets(){
    for( c in resetCharge ){
        towers[resetCharge[c]].countUp = -getRate( resetCharge[c] );
    }
    resetCharge = [];
}

function checkDead( m ){
    if( mobs[m].health <= 0 ){
        game.me.coin += getReward( m );
        if( mobs[m].type == `boss` ){ gainDiamond( mobs[m].mod ); }
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
    // for( t in towers ){ drawTower( towers[t].type, towers[t].loc.x - dim / 2, towers[t].loc.y - dim / 2, ctxT, t ); };
    for( t in towers ){ makeTower( towers[t].type, towers[t].loc.x - dim / 2, towers[t].loc.y - dim / 2, ctxT, t ); };
}

function paintTowerRing( t ){
    let til = unit( tileDim / 2 );
    let x = unit( towers[t].tileX * tileDim );
    let y = unit( towers[t].tileY * tileDim );
    ctxT.beginPath();
    ctxT.arc( x + til, y + til, getRange( t ), 0, Math.PI * 2 );
    ctxT.strokeStyle = colour.ring;
    ctxT.lineWidth = scale(2);
    ctxT.stroke();
    ctxT.closePath();
}

function renderBuyOptions(){
    let target = document.querySelector(`#buyPane`);
    target.innerHTML = ``;
    let i = 0;
    for( t in stat.towers ){
        if( meta.upgrades[t].unlock ){
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
    p.classList = `bottomBox flexy colStack`;
    let p1 = document.createElement(`div`);
    p1.classList = `panelTitle bottomGutter`;
    p1.innerHTML = `${nicify( tower )}`;
    p.appendChild( p1 );
    let p2 = document.createElement(`div`);
    p2.classList = `largeTowerImg colour background ${tower}`;
    p.appendChild( p2 );
    let p3 = document.createElement(`div`);
    p3.classList = `buyButton flexy topGutter`;
    p3.setAttribute( `buy`, tower );
    p3.innerHTML = `<div class="smallImg coin coinGap"></div> ${niceNumber( Math.floor( game.me.towerCost * stat.towers[tower].mod ) )}`;
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
    p11.classList = `towerImg background colour ${subj}`;
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

function gameOverStamp(){
    game.mode = `over`;
    let plot = generateQuadrilateral( canvW / 2, canvH / 2, 0.1, 0.05, canvW / 4, canvH / 4 );
    // overlay
    ctxT.beginPath();
    ctxT.rect( 0, 0, canvW, canvH );
    ctxT.fillStyle = colour.modal;
    ctxT.fill();
    ctxT.closePath();
    // stamp
    ctxT.beginPath();
    ctxT.moveTo( plot.c0.x, plot.c0.y );
    ctxT.lineTo( plot.c1.x, plot.c1.y );
    ctxT.lineTo( plot.c2.x, plot.c2.y );
    ctxT.lineTo( plot.c3.x, plot.c3.y );
    ctxT.lineTo( plot.c0.x, plot.c0.y );
    ctxT.fillStyle = colour.locked;
    ctxT.fill();
    ctxT.closePath();
    ctxT.textAlign = `center`;
    ctxT.fillStyle = colour.text;
    ctxT.font = `${unit( 96 )}px "Berlin Sans FB Demi"`;
    ctxT.fillText( `GAME OVER`, canvW / 2, canvH / 2 + unit( 96 / 2 )  );
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
        if( checkAfford( Math.floor( game.me.towerCost * stat.towers[type].mod ) ) ){ n[i].classList.remove(`inactive`); }
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
function updateWavesDisplay(){
    let w = 0;
    for( l in meta.records ){ w += meta.records[l]; }
    document.querySelector(`#waves`).innerHTML = niceNumber( w );
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
    return Math.ceil( stat.mobs[mobs[m].type].reward * Math.pow( game.scale.reward, mobs[m].mod ) / Math.log( mobs[m].mod + 3 ) );
}
function gainDiamond( w ){
    let amt = Math.floor( ( w + 1 ) / 10 );
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
function getAmount( t ){
    return stat.towers[towers[t].type].amount * Math.pow( game.upgrade.amount, towers[t].upgrade.amount );
}
function getDuration( t ){
    return Math.ceil( stat.towers[towers[t].type].duration * Math.pow( game.upgrade.duration, towers[t].upgrade.duration ) );
}
function getChance( t ){
    return stat.towers[towers[t].type].chance * Math.pow( game.upgrade.chance, towers[t].upgrade.chance );
}
function getSplash( t ){
    return tileDim * stat.towers[towers[t].type].splash * Math.pow( game.upgrade.splash, towers[t].upgrade.splash );
}
function getBenefit( key, type ){
    return meta.upgrades[key][type].owned * meta.upgrades[key][type].benefit;
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
        let cost = Math.floor( game.me.towerCost * stat.towers[type].mod );
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
        let reward = Math.ceil( game.waves.countDown / ( 1000 / frameRate ) / 3 );
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

// function drawTower( type, x, y, ctx, t ){
//     let spokes = stat.towers[type].upg.length;
//     let sWidth = 2;
//     ctx.strokeStyle = colour.tStroke;
//     ctx.lineWidth = scale( unit( sWidth ) );
//     for( let s = 0; s < spokes; s++ ){
//         let angle = makeRadian( 360 / spokes * s );
//         if( spokes % 2 !== 0 ){ angle += makeRadian( 180 ); }
//         else{ angle += makeRadian( 45 ); }
//         let angleDiff = makeRadian( 10 );
//         let dist = unit( towerDim ) / 2;
//         let buffer = unit( towerDim ) / 4 + unit( sWidth / 2 );
//         let perc = towers[t].upgrade[Object.keys(towers[t].upgrade)[s]] / game.vars.maxUpgrade;
//         let plotA = rToXY( dist, angle - angleDiff );
//         let plotB = rToXY( dist, angle + angleDiff );
//         let plotA2 = rToXY( buffer + ( dist - buffer ) * perc, angle - angleDiff );
//         let plotB2 = rToXY( buffer + ( dist - buffer ) * perc, angle + angleDiff );
//         // spoke fill
//         if( perc < 1 ){ ctx.fillStyle = colour.upgrade; }
//         else{ ctx.fillStyle = colour.upgraded; }
//         ctx.beginPath();
//         ctx.moveTo( x + unit( tileDim ) / 2, y + unit( tileDim ) / 2 );
//         ctx.lineTo( x + unit( tileDim ) / 2 + plotA2.x, y + unit( tileDim ) / 2 + plotA2.y );
//         ctx.lineTo( x + unit( tileDim ) / 2 + plotB2.x, y + unit( tileDim ) / 2 + plotB2.y );
//         ctx.lineTo( x + unit( tileDim ) / 2, y + unit( tileDim ) / 2 );
//         ctx.fill();
//         ctx.closePath();
//         // spoke border
//         ctx.beginPath();
//         ctx.moveTo( x + unit( tileDim ) / 2, y + unit( tileDim ) / 2 );
//         ctx.lineTo( x + unit( tileDim ) / 2 + plotA.x, y + unit( tileDim ) / 2 + plotA.y );
//         ctx.lineTo( x + unit( tileDim ) / 2 + plotB.x, y + unit( tileDim ) / 2 + plotB.y );
//         ctx.lineTo( x + unit( tileDim ) / 2, y + unit( tileDim ) / 2 );
//         ctx.stroke();
//         ctx.closePath();
//     }
//     ctx.beginPath();
//     ctx.arc( x + unit( tileDim ) / 2, y + unit( tileDim ) / 2, unit( towerDim ) / 4, 0, Math.PI * 2 );
//     ctx.fillStyle = colour[type];
//     ctx.fill();
//     ctx.stroke();
//     ctx.closePath();
//     x += tileDim / 2;
//     y += tileDim / 2;
//     let tUnit = towerDim / 4;
//     ctx.drawImage( img[type], -tUnit + x, -tUnit + y, tUnit * 2, tUnit * 2 );
// }

function makeTower( type, x, y, ctx, t ){
    x += tileDim / 2;
    y += tileDim / 2;
    let tUnit = towerDim / 3;
    ctx.drawImage( img[type], -tUnit + x, -tUnit + y, towerDim / 1.5, towerDim / 1.5 );

    ctx.fillStyle = colour[`${type}Dark`];
    ctx.strokeStyle = colour[`${type}Dark`];
    ctx.lineWidth = scale( 5 )
    ctx.beginPath();
    ctx.moveTo( x, y );
    let to = rToXY( scale( 15 ), towers[t].angle );
    ctx.lineTo( to.x + towers[t].loc.x, to.y + towers[t].loc.y );
    ctx.stroke();
    ctx.closePath();


    ctx.beginPath();
    ctx.arc( x, y, unit( towerDim ) / 10, 0, Math.PI * 2 );    
    ctx.fill();
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
    var myFont = new FontFace(`New Font`, `url(https://fonts.cdnfonts.com/s/13625/BRLNSDB.woff)`);
    myFont.load().then(function(font){  
        document.fonts.add(font);
        console.log('fonts loaded');
    });
    finishOnload();
}

function buildMeta(){
    for( t in stat.towers ){
        if( meta.upgrades[t] == undefined ){
            meta.upgrades[t] = {
                costDown: { owned: 0, max: 3 }
                , upgradeDown: { owned: 0, max: 4, benefit: 0.1 }
                , maxUpgrade: { owned: 0, max: 14, benefit: 1 }
            };
            for( let i = 0; i < stat.towers[t].upg.length; i++ ){
                meta.upgrades[t][stat.towers[t].upg[i]] = { owned: 0, max: 4, benefit: 1 }
            }
            if( stat.towers[t].upg.length == 3 ){} // grant some other upgradable
            if( !stat.towers[t].default ){ meta.upgrades[t].unlock = false; }
            else{ meta.upgrades[t].unlock = true; }
        }
    }
    if( meta.upgrades.me == undefined ){
        meta.upgrades.me = {
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
    meta.unlocks = [ 0 ];
    for( let l = 1; l < jason.length; l++ ){
        let newU = meta.unlocks[meta.unlocks.length-1] + 25 * l;
        newU = Math.floor( newU * Math.pow( 1.025, l ) / 25 ) * 25;
        meta.unlocks.push( newU );
    }
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

function randBetweenPrecise( x, y ){
    var output = Math.random() * ( y - x ) + x;
    return output;
}

function makeRadian( n ){
    return n * ( Math.PI/180 );
}

function makeDegrees( n ){
    return n / ( Math.PI/180 );
}
















/* TODO

adjust nav buttons to be actually vertically centred (make six segments and centre to Y of 2 - 5 )
Add a Play button to level select interface

- Support   -- Range, Amount, ???

Caltrop - Damage and slow, build up over time but drop slowly
Minigun - Spiral of bullets that hit or they don't
Poison - some fun interaction with Burning ?
Necro - raise dead in range to fight oncoming --> range, power, 
Laser - Shoots everything within range, damage divided among them (however many there are)
Debuff - Take more damage within the range, the closer the more amplified




tower legs using either bezierCurveTo() or quadraticCurveTo()


*/
/* IDEAS
Upgrades
- Cash to start             > > >
- Cash earned               > > >
- Interest                  > > >
- Start hearts              > > > > >
- Speed controls            > >
- Skip control              >
- - Skip cash bonus         > >

per tower
- Cost down                 > > > >
- Upgrade cost down         > > >
- Upgrade cost scale down   > >
- Damage up                 > > > > >
- Range up                  > > >
- Rate up                   > > >
- Special up                > > > > >
- Max upgrade rank          > > > > > + 10

additional towers (secondary and tertiary)


UI pause
Split path ? Multiple Exits?


*/