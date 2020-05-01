/*global R, T, G, Utils, game*/
"use strict";

var Controls = {};
var cursors;

Controls.selected = [];

Controls.getSelected = function (tile) {
    if (Controls.selected.length) {
        return Controls.selected;
    }
    return [tile];
};

Controls.add = function () {
    Controls.controls = game.add.group();
    Controls.controls.position.set(-100);
    
    Controls.rotationControls = Controls.make(Controls.controls, 'rotate', T.releaseRotate, T.startRotate);
    Controls.flipControls = Controls.make(Controls.controls, 'flip', T.onFlip);
    Controls.zoom = Controls.make(Controls.controls, 'zoom', T.onZoom);
    Controls.stackControls = Controls.make(Controls.controls, 'stack', S.onTidy);
    Controls.shuffleControls = Controls.make(Controls.controls, 'shuffle', S.onShuffle);
    Controls.handControls = Controls.make(Controls.controls, 'hand', T.onTake);
    Controls.lockControls = Controls.make(Controls.controls, 'lock', T.onLock);
    Controls.userControls = Controls.make(Controls.controls, 'user', T.onUserOwn);
    
    Controls.rotationControls.scale.set(0.7);

    Controls.graphics = game.add.graphics(0, 0);
    Controls.graphics.lineStyle(10, 0xFFFFFF, 0.8);
    Controls.graphics.beginFill(0x0077FF, 0.3);

    Controls.highlight = game.add.graphics(0, 0);
    Controls.highlight.lineStyle(10, 0xFFFFFF, 0.8);
    Controls.highlight.beginFill(0x0077FF, 0.2);
};

Controls.make = function (group, assetName, upMethod, downMethod) {
    var control = group.create(0,0, assetName);
    T.centerAnchor(control);
    control.inputEnabled = true;
    control.input.useHandCursor = true;
    control.events.onInputUp.add(upMethod);
    if (downMethod) control.events.onInputDown.add(downMethod);
    Cursor.reset(control);
    return control;
};


Controls.setTarget = function (target) {
    Controls.target = target;
    Controls.hide();
    Controls.assignRelativePositions(target);
    return target;
};


Controls.assignRelativePositions = function (target) {
    R.forEach(S.assignRelativePosition(target))(Controls.selected);
};


Controls.at = function (tile) {
    Controls.show(tile);
    Utils.aboveCorner(Controls.controls, tile);
};

Controls.colorize = function (tile) {
    if (tile.isStash) {
        Controls.userControls.tint = !tile.ownedBy ? 0xFFFFFF: tile.ownedBy === playerName ? 0x33FF66: 0xFF3366;
    }
    
    return tile;
};

Controls.show = function (tile) {
    Controls.positionX = 0;  

    Controls.controls.visible = true;
    // single tile
    Controls.position(Controls.flipControls, tile.flipable);
    Controls.position(Controls.zoom, tile.scalably);
    Controls.position(Controls.handControls, tile.handable && Controls.selected.length <= 1);
    Controls.position(Controls.userControls, tile.isStash && Controls.selected.length <= 1);
    console.log('lockable check');
    Controls.position(Controls.lockControls, tile.lockable && Controls.selected.length <= 1);
    Controls.colorize(tile);
    // multi selection
    Controls.position(Controls.stackControls, Controls.selected.length > 1 && !tile.isDice);
    Controls.position(Controls.shuffleControls, Controls.selected.length > 1 && !tile.isDice);
    Controls.position(Controls.rotationControls, tile.rotateable );
};

Controls.position = function (controlButton, condition) {
    if (condition) {
        controlButton.visible = true;
        controlButton.x = Controls.positionX;
        Controls.positionX += controlButton.width;
    } else {
        controlButton.visible = false;
    }
};

Controls.cloneTargetPos = function () {
    return Controls.target && Controls.target.position.clone();
};



Controls.hide = function (tile) {
    if (tile) {
        if (Controls.target === tile) Controls.controls.visible = false;
    } else {
        Controls.controls.visible = false;
    }
    return tile;
};


//  Our controls.
Controls.cursors = function () {
    game.input.keyboard.createCursorKeys();
};


// multi select

Controls.onStartSelection = function (target, point) {
    console.log('onStartSelection', point);
    Controls.hide();
    if (Touch.touching) {
        return;
    }
    Controls.selecting = true;
    Controls.rect = {x: point.worldX / game.camera.scale.x, y: point.worldY / game.camera.scale.y};
};


Controls.sanitizeRect = function (rect) {
    var newRect = {};
    
    if (rect.width < 0) {
        newRect.x = rect.x + rect.width;
        newRect.width =  - rect.width;
    } else {
        newRect.x = rect.x;
        newRect.width = rect.width;
    }
    
    if (rect.height < 0) {
        newRect.y = rect.y + rect.height;
        newRect.height =  - rect.height;
    } else {
        newRect.y = rect.y;
        newRect.height = rect.height;
    }
    return newRect;
};


Controls.onStopSelection = function () {
    console.log('onStopSelection');
    Controls.selecting = false;
    Controls.graphics.clear();
    if (Controls.selected.length) {
        Controls.at(Controls.setTarget(Controls.selected[0]));
    }
};


Controls.findSelectedTiles = function (rect) {
    var selected = [];
    R.mapObj(function (group) {
        R.forEach(function (child) {
           var found = Utils.pointIntersection(child, rect);
           if (found && !child.locked && child.stackable) {
                console.log('found');
                T.select(child);
                selected.push(child);
           } else {
                T.deselect(child);
           }
        })(group.children);
        
    })(G.groups.all());

    return selected;
};


Controls.dragAlong = function (tiles) {
    if (T.dragging) {
        R.forEach(S.moveRelativeTo(Controls.target))(tiles);
    }
};


Controls.update = function () {
    if (Touch.touching) {
        Controls.onStopSelection();
    }
    
    if (Controls.selecting) {
        if (game.input.mouse.event || game.input.pointer1.active) {
            Controls.rect.width =  game.input.activePointer.worldX / game.camera.scale.x - Controls.rect.x;
            Controls.rect.height = game.input.activePointer.worldY / game.camera.scale.y - Controls.rect.y;
            Controls.graphics.clear();

            Controls.selected = Controls.findSelectedTiles(Controls.sanitizeRect(Controls.rect));

            Controls.graphics.drawRect(
                Controls.rect.x,
                Controls.rect.y,
                Controls.rect.width,
                Controls.rect.height
            );

        }
    }
    else if (Controls.selected.length) {
        if (game.input.mouse.event || game.input.pointer1.active) {
            Controls.dragAlong(Controls.selected);  
        }
    }
};

Controls.verifySelection = function (tile) {
    if (!R.contains(tile)(Controls.selected)) {
        Controls.deselectAll();
        console.debug('Tile not in selection, dropping selection');
    }
};


Controls.deselectAll = function () {
    R.forEach(T.deselect)(Controls.selected);
    Controls.selected = [];
};
