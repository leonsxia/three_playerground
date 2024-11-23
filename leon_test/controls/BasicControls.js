import { Plane, Raycaster, Vector2, Vector3 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const ROT_SPEED_XY = 0.003;
const ROT_SPEED_Z = 0.002;
const X_AXIS = new Vector3(1, 0, 0);
const Y_AXIS = new Vector3(0, 1, 0);
const Z_AXIS = new Vector3(0, 0, 1);
const PLANE_XY = new Plane(Z_AXIS);
const NEAR = 55;
const FAR = 265;
const CAMERA_RAY_LAYER = 1;

class BasicControls {

    controls = [];
    perspectiveCamera;
    orthoCamera;
    activeCamera;
    domElement;
    raycaster;
    object;

    _camera;

    _initialCameraPostion;
    _mouse = new Vector2();
    _objectProject = new Vector3();
    _preIntersected = new Vector3();
    _intersected = new Vector3();
    _isPicked;

    // events
    _isMouseLeftDown = false;
    _isMouseRightDown = false;
    _isRotating = false;
    _isMoving = false;

    _near;
    _far;

    constructor(options) {

        const { perspectiveCamera, orthoCamera, domElement, object, near = NEAR, far = FAR } = options;

        this.perspectiveCamera = perspectiveCamera;
        this.orthoCamera = orthoCamera;
        this.domElement = domElement;
        this.activeCamera = this.perspectiveCamera;
        this.controls = [new OrbitControls(this.perspectiveCamera, this.domElement), new OrbitControls(this.orthoCamera, this.domElement)];
        this.raycaster = new Raycaster();
        this.raycaster.layers.set(CAMERA_RAY_LAYER);
        this.object = object;

        this._initialCameraPostion = this.perspectiveCamera.position.clone();
        this._near = near;
        this._far = far;

    }

    // camera is a ref
    init(camera) {

        this.bindUserControls();
        this.camera = camera;
        this.camera.value = this.activeCamera;

    }

    switch(camType) {

        switch (camType) {

            case 0:

                this.activeCamera = this.perspectiveCamera;
                break;

            case 1:

                this.activeCamera = this.orthoCamera;
                break;

        }

        this.resetControl();
        this.camera.value = this.activeCamera;

    }

    showCameraInfo() {

        if (this.activeCamera.isOrthographicCamera) {
            console.log(`left:${this.orthoCamera.left}, right:${this.orthoCamera.right}, position:${[...this.orthoCamera.position]}, zoom:${this.orthoCamera.zoom}`);
        } else {
            console.log(`position:${[...this.perspectiveCamera.position]}, zoom:${this.perspectiveCamera.zoom}`);
        }

    }

    showMouseEvent() {

        console.log(`isMouseLeftDown: ${this._isMouseLeftDown}, isMouseRightDown: ${this._isMouseRightDown}`);
        console.log(`isRotating: ${this._isRotating}, isMoving: ${this._isMoving}`);

    }

    bindUserControls() {

        const canvas = this.domElement;

        canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        canvas.addEventListener('wheel', this.onMouseWheel.bind(this));

        // window.addEventListener('keydown', this.onKeyDown.bind(this));

    }

    resetControl() {

        this.controls.forEach(ctl => ctl.reset());
    }

    saveState() {

        this.controls.forEach(ctl => ctl.saveState());

    }

    disableControls() {

        this.controls.forEach(ctl => ctl.enabled = false);

    }

    enableControls() {

        this.controls.forEach(ctl => ctl.enabled = true);

    }

    onKeyDown(event) {

        switch (event.keyCode) {

            case 79: /*O*/

                if (!this.activeCamera.isOrthographicCamera) {

                    this.activeCamera = this.orthoCamera;

                }

                this.camera.value = this.activeCamera;
                break;

            case 80: /*P*/

                if (!this.activeCamera.isPerspectiveCamera) {

                    this.activeCamera = this.perspectiveCamera;

                }

                this.camera.value = this.activeCamera;
                break;

        }

        console.log(`active camera:`, this.activeCamera);

    }    

    onMouseWheel() {
        
        // this.showCameraInfo();  

        const objPos = new Vector3();
        const dist = Math.abs(this.object.getWorldPosition(objPos).sub(this.perspectiveCamera.position).z);

        // console.log(`dist: ${dist}`);

        if (dist < this._near || dist > this._far) {

            this.disableControls();
            this.resetControl();

        } else {

            this.saveState()
            this.enableControls();

        }

    }

    onMouseMove(event) {

        // console.log(`x:${event.movementX}, y:${event.movementY}`);

        this._mouse.x = ( event.offsetX / this.domElement.clientWidth ) * 2 - 1;
        this._mouse.y = - ( event.offsetY / this.domElement.clientHeight ) * 2 + 1;        

        // console.log(`offsetX:${event.offsetX}, y:${event.offsetY}`);
        // console.log(`mouseX:${this._mouse.x}, mouseY:${this._mouse.y}`);  

        const movementX = event.movementX;
        const movementY = event.movementY;

        if (this._isRotating) {

            if (this._isPicked) {
                
                this.object.rotateOnWorldAxis(Y_AXIS, movementX * ROT_SPEED_XY);
                // this.object.rotateOnWorldAxis(Z_AXIS, - movementX * ROT_SPEED_Z);
                this.object.rotateOnWorldAxis(X_AXIS, movementY * ROT_SPEED_XY);

            } else {

                this.object.getWorldPosition(this._objectProject);
                // console.log(`worldPosX:${this._objectProject.x}, worldPosY:${this._objectProject.y}`);
                this._objectProject.project(this.activeCamera);
                // console.log(`projPosX:${this._objectProject.x}, projPosY:${this._objectProject.y}`);
                
                const radian = this._mouse.x >= this._objectProject.x ? - movementY * ROT_SPEED_Z : movementY * ROT_SPEED_Z;
                this.object.rotateOnWorldAxis(Z_AXIS, radian);

            }

        }

        if (this._isMoving) {

            this.raycaster.setFromCamera(this._mouse, this.activeCamera);
            this.raycaster.ray.intersectPlane(PLANE_XY, this._intersected);
            // console.log(`intersected coords:`, this._intersected);
            // console.log(`orthoCamZoom: ${this.orthoCamera.zoom}`);

            const dir = this._intersected.clone().sub(this._preIntersected);
            this._preIntersected.copy(this._intersected);
            this.object.position.add(dir);

        }

    }    

    onMouseDown(event) {        
        
        if (event.button === 0) {

            this._isMouseLeftDown = true;

            if (!this._isMouseRightDown) {
                
                this._isRotating = true;

            } else {

                this._isRotating = false;

            }

        } else if (event.button === 2) {

            this._isMouseRightDown = true;

            if (!this._isMouseLeftDown) {

                this._isMoving = true;

            } else {

                this._isMoving = false;

            }

        }

        this.raycaster.setFromCamera(this._mouse, this.activeCamera);
        this.raycaster.ray.intersectPlane(PLANE_XY, this._preIntersected);
        const intersects = this.raycaster.intersectObjects([this.object]);

        if (intersects.length > 0) {

            this._isPicked = true;

        } else {

            this._isPicked = false;

        }

        this.disableControls();
        // this.showMouseEvent();
        
    }

    onMouseUp(event) {

        if (event.button === 0) {

            this._isMouseLeftDown = false;
            this._isRotating = false;

        } else if (event.button === 2) {

            this._isMouseRightDown = false;
            this._isMoving = false;

        }

        if (!this._isMouseLeftDown && !this._isMouseRightDown) {

            this.enableControls();
            this._isPicked = false;

        }

        // this.showMouseEvent();

    }

}

export { BasicControls };