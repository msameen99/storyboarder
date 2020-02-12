const THREE = require('three')

class CameraControls {
  
  constructor ( object, domElement, options = {} ) {
    this._object = object
    this._prevValues = {...object}
    this.domElement = domElement
    this.enabled = true
    
    this.moveAnalogue = false
    
    this.movementSpeed = .0005
    this.maxSpeed = 0.07
    this.zoomSpeed = 0
    
    this.keydowns = new Set()
    
    this.onPointerMove = this.onPointerMove.bind(this)
    this.onPointerDown = this.onPointerDown.bind(this)
    this.onPointerUp = this.onPointerUp.bind(this)
    this.onKeyDown = this.onKeyDown.bind(this)
    this.onKeyUp = this.onKeyUp.bind(this)
    
    this.onWheel = this.onWheel.bind(this)
    
    this.isMoveOn = false
    this.runMode = false
    
    this.undoGroupStart = options.undoGroupStart
    this.undoGroupEnd = options.undoGroupEnd
    this.onChange = options.onChange
    
    this.intializeEvents()
  }
  
  set object(value) {
    this._object = value
    this._prevValues = {...value}
  }

  intializeEvents() {
    window.addEventListener( 'pointermove', this.onPointerMove, false )
    this.domElement.addEventListener( 'pointerdown', this.onPointerDown, false )
    document.addEventListener( 'pointerup', this.onPointerUp, false )
    window.addEventListener( 'keydown', this.onKeyDown, false )
    window.addEventListener( 'keyup', this.onKeyUp, false )
    this.domElement.addEventListener("wheel", this.onWheel, false )
  }
  
  dispose () {
    window.removeEventListener( 'pointermove', this.onPointerMove )
    this.domElement.removeEventListener( 'pointerdown', this.onPointerDown )
    document.removeEventListener( 'pointerup', this.onPointerUp )
    window.removeEventListener( 'keydown', this.onKeyDown )
    window.removeEventListener( 'keyup', this.onKeyUp )
    this.domElement.removeEventListener("wheel", this.onWheel )
  }
  
  onPointerMove ( event ) {
    
    this.mouseX = event.pageX
    this.mouseY = event.pageY
  }
  
  onPointerDown ( event ) {
    event.preventDefault()
    event.stopPropagation()
    
    this.domElement.focus()
    
    this.initialRotation = this._object.rotation
    this.initialTilt = this._object.tilt
    
    this.initialMouseX = event.pageX
    this.initialMouseY = event.pageY
    this.mouseX = event.pageX
    this.mouseY = event.pageY
    this.mouseDragOn = true
    
    this.undoGroupStart()
  
    this.onChange({active: this.mouseDragOn, object: this._object})
  }
  
  onPointerUp ( event ) {
    event.preventDefault()
    
    if (this.mouseDragOn) {
      this.onChange({active: false, object: this._object})
      this.undoGroupEnd()
    }
    
    this.mouseDragOn = false
  }
  
  addKey (key) {
    if (this.keydowns.size === 0) {
      this.undoGroupStart()
    }
    this.keydowns.add(key)
  }
  removeKey (key) {
    this.keydowns.delete(key)
    if (this.keydowns.size === 0) {
      this.undoGroupEnd()
    }
  }
  
  
  onKeyDown ( event ) {
    // Ignore Cmd + R (reload) and Cmd + D (duplicate)
    if (event.metaKey) return
    
    this.addKey(event.keyCode)
    
    switch ( event.keyCode ) {
      case 38: /*up*/
      case 87: /*W*/
      case 37: /*left*/
      case 65: /*A*/
      case 40: /*down*/
      case 83: /*S*/
      case 39: /*right*/
      case 68: /*D*/
      case 82: /*R*/
      case 70: /*F*/
        if ( this.moveForward || this.moveBackward || this.moveLeft || this.moveRight || this.moveUp || this.moveDown) {
        } else {
          this.movementSpeed = .0001
        }
        break
      case 16:
        this.runMode = true
        break
    }
    
    switch ( event.keyCode ) {
      case 38: /*up*/
      case 87: /*W*/ this.moveForward = true; break
      case 37: /*left*/
      case 65: /*A*/ this.moveLeft = true; break
      case 40: /*down*/
      case 83: /*S*/ this.moveBackward = true; break
      case 39: /*right*/
      case 68: /*D*/ this.moveRight = true; break
      case 82: /*R*/ this.moveUp = true; break
      case 70: /*F*/ this.moveDown = true; break
    }
  }
  
  onKeyUp ( event ) {
    this.removeKey(event.keyCode)
    
    switch ( event.keyCode ) {
      case 38: /*up*/
      case 87: /*W*/ this.moveForward = false; break;
      case 37: /*left*/
      case 65: /*A*/ this.moveLeft = false; break;
      case 40: /*down*/
      case 83: /*S*/ this.moveBackward = false; break;
      case 39: /*right*/
      case 68: /*D*/ this.moveRight = false; break;
      case 82: /*R*/ this.moveUp = false; break;
      case 70: /*F*/ this.moveDown = false; break;
      case 16: /* shift */ this.runMode = false; break;
    }
  }
  
  onWheel ( event ) {
    this.zoomSpeed += (event.deltaY * 0.005)
  }
  
  
  reset () {
    this.moveForward = false
    this.moveLeft = false
    this.moveBackward = false
    this.moveRight = false
    this.moveUp = false
    this.moveDown = false
    this.moveAnalogue = false
  }
  
  isChanged() {
    return (
        this._object.x !== this._prevValues.x ||
        this._object.y !== this._prevValues.y ||
        this._object.z !== this._prevValues.z ||
        this._object.rotation !== this._prevValues.rotation ||
        this._object.tilt !== this._prevValues.tilt ||
        this._object.fov !== this._prevValues.fov
    )
  }
  
  static getMovedState (object, movementSpeed) {
    let loc = new THREE.Vector2(object.x, object.y)
    let result = new THREE.Vector2(movementSpeed.x + loc.x, movementSpeed.y + loc.y).rotateAround(loc,-object.rotation)
    
    return {
      ...object,
      x: result.x,
      y: result.y
    }
  }
  
  update ( delta, state ) {
    
    if ( this.enabled === false ) return
    
    this._object.fov += this.zoomSpeed
    this._object.fov = Math.max(3, this._object.fov)
    this._object.fov = Math.min(71, this._object.fov)
    
    this.zoomSpeed = this.zoomSpeed * 0.0001
    
    // DualshockController
    let deadzone = 0.1
    
    // position
    let lStickX = (state.devices[0].analog.lStickX/127) - 1
    let lStickY = (state.devices[0].analog.lStickY/127) - 1
    
    if (Math.abs(lStickX) > deadzone || Math.abs(lStickY) > deadzone) {
      this.moveAnalogue = true
    } else {
      this.moveAnalogue = false
    }
    
    if (this.mouseDragOn) {
      let rotation = this.initialRotation - (this.mouseX - this.initialMouseX)*0.001
      this._object.rotation = rotation
      let tilt = this.initialTilt - (this.mouseY - this.initialMouseY)*0.001
      this._object.tilt = Math.max(Math.min(tilt, Math.PI / 2), -Math.PI / 2)
    }
    
    // rotation
    let rStickX = (state.devices[0].analog.rStickX/127) - 1
    let rStickY = (state.devices[0].analog.rStickY/127) - 1
    
    if (Math.abs(rStickX) > deadzone || Math.abs(rStickY) > deadzone) {
      this._object.rotation -= (rStickX * 0.03) * Math.abs(Math.pow(rStickX, 2))
      this._object.tilt -= (rStickY * 0.02) * Math.abs(Math.pow(rStickY, 2))
      this._object.tilt = Math.max(Math.min(this._object.tilt, Math.PI / 2), -Math.PI / 2)
    }
    
    if (this.moveAnalogue) {
      let loc = new THREE.Vector2(this._object.x, this._object.y)
      let magX = (lStickX*0.07) * (Math.abs(Math.pow(lStickX, 2)))
      let magY = (lStickY*0.1) * (Math.abs(Math.pow(lStickY, 2)))
      if (state.devices[0].digital.l3) {
        magY *= 4.0
      }
      let result = new THREE.Vector2(magX+loc.x, magY+loc.y).rotateAround(loc,-this._object.rotation)
      this._object.x = result.x
      this._object.y = result.y
    }
    
    this.isMoveOn = false
    if ( this.moveForward || this.moveBackward || this.moveLeft || this.moveRight || this.moveUp || this.moveDown) {
      if (this.runMode) {
        this.movementSpeed += (0.002/0.0166666)*delta
        this.movementSpeed = Math.min(this.movementSpeed, ((this.maxSpeed*5)/0.0166666)*delta)
      } else {
        this.movementSpeed += (0.0007/0.0166666)*delta
        this.movementSpeed = Math.min(this.movementSpeed, (this.maxSpeed/0.0166666)*delta)
      }
      
      this.isMoveOn = true
    }
    
    if ( this.moveForward ) {
      let loc = new THREE.Vector2(this._object.x, this._object.y)
      let result = new THREE.Vector2(0+loc.x, -this.movementSpeed+loc.y).rotateAround(loc,-this._object.rotation)
      
      this._object.x = result.x
      this._object.y = result.y
    }
    
    if ( this.moveBackward ) {
      let loc = new THREE.Vector2(this._object.x, this._object.y)
      let result = new THREE.Vector2(0+loc.x, this.movementSpeed+loc.y).rotateAround(loc,-this._object.rotation)
      
      this._object.x = result.x
      this._object.y = result.y
    }
    
    if ( this.moveLeft ) {
      let loc = new THREE.Vector2(this._object.x, this._object.y)
      let result = new THREE.Vector2(-this.movementSpeed+loc.x, 0+loc.y).rotateAround(loc,-this._object.rotation)
      
      this._object.x = result.x
      this._object.y = result.y
    }
    if ( this.moveRight ) {
      let loc = new THREE.Vector2(this._object.x, this._object.y)
      let result = new THREE.Vector2(this.movementSpeed+loc.x, 0+loc.y).rotateAround(loc,-this._object.rotation)
      
      this._object.x = result.x
      this._object.y = result.y
    }

    if ( this.moveUp ) {
      this._object.z += this.movementSpeed
    }
    
    if (state.devices[0].analog.r2) {
      this._object.z -= ((state.devices[0].analog.r2/127.0)*0.002)*(Math.pow((state.devices[0].analog.r2/127.0),2))
      this._object.z = Math.max(0, this._object.z)
    }
    
    if ( this.moveDown ) {
      this._object.z -= this.movementSpeed
      this._object.z = Math.max(0, this._object.z)
    }
    
    if (state.devices[0].analog.l2) {
      this._object.z += ((state.devices[0].analog.l2/127.0)*0.002)*(Math.pow((state.devices[0].analog.l2/127.0),2))
    }
    
    if (this.isMoveOn || this.mouseDragOn || this.isChanged()) {
      this.onChange({active: this.mouseDragOn && !this.isMoveOn, object: this._object})
    }
    
    this._prevValues = {...this._object}
    
    // if (state.devices[0].digital.r1 || state.devices[0].digital.l1) {
    //   this.zoomSpeed += 0.002
    //   this.zoomSpeed = Math.min(this.zoomSpeed, 0.1)
    
    // } else {
    //   this.zoomSpeed = 0.001
    // }
    
    
    // if (state.devices[0].digital.r1) {
    //   this.object.fov -= this.zoomSpeed
    //   this.object.fov = Math.max(3, this.object.fov)
    // }
    // if (state.devices[0].digital.l1) {
    //   this.object.fov += this.zoomSpeed
    //   this.object.fov = Math.min(71, this.object.fov)
    // }
    // this.object.updateProperties()
  }
  
}

CameraControls.objectFromCameraState = cameraState =>
    ({
      x: cameraState.x,
      y: cameraState.y,
      z: cameraState.z,
      rotation: cameraState.rotation,
      tilt: cameraState.tilt,
      fov: cameraState.fov,
      roll: cameraState.roll
    })


module.exports = CameraControls
