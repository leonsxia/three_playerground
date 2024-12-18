import { Plane, Raycaster, Vector2, Vector3 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const ROT_SPEED_X = 0.03;
const ROT_SPEED_Y = 0.05;
const ROT_SPEED_Z = 0.02;
const ROT_DOWN_SPEED_Z = 80;
const X_AXIS = new Vector3(1, 0, 0);
const Y_AXIS = new Vector3(0, 1, 0);
const Z_AXIS = new Vector3(0, 0, 1);
const PLANE_XY = new Plane(Z_AXIS);
const NEAR = 55;
const FAR = 265;
const RADIUS = 50;
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
    _modelPositionX;

    _initialCameraPostion;
    _mouse = new Vector2();
    _objectProject = new Vector3();
    _objectLeftProject = new Vector3();
    _objectRightProject = new Vector3();
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
    _radius;

    constructor(options) {

        const { perspectiveCamera, orthoCamera, domElement, object, near = NEAR, far = FAR, radius = RADIUS } = options;

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
        this._radius = radius;

        this.controls.forEach(ctl => {

            ctl.enablePan = false;
            ctl.enableRotate = false;
            
        });

    }

    // camera is a ref
    // modelPosition is a ref, for outside watch
    init(camera, modelPosition = { value: new Vector3() }) {

        this.bindUserControls();
        this.camera = camera;
        this.camera.value = this.activeCamera;

        this._modelPosition = modelPosition;

    }

    reset() {

        this.perspectiveCamera.position.copy(this._initialCameraPostion);
        this.orthoCamera.zoom = 1;
        this.orthoCamera.updateProjectionMatrix();

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

    resetControls() {

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
        
        this.showCameraInfo();  

        const objPos = new Vector3();
        const dist = Math.abs(this.object.getWorldPosition(objPos).sub(this.perspectiveCamera.position).z);

        // console.log(`dist: ${dist}`);

        if (dist < this._near || dist > this._far) {

            this.disableControls();
            this.resetControls();

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

        // const movementX = event.movementX;
        // const movementY = event.movementY;

        this.raycaster.setFromCamera(this._mouse, this.activeCamera);
        this.raycaster.ray.intersectPlane(PLANE_XY, this._intersected);
        // console.log(`intersected coords:`, this._intersected);
        // console.log(`orthoCamZoom: ${this.orthoCamera.zoom}`);
        const dir = this._intersected.clone().sub(this._preIntersected);
        this._preIntersected.copy(this._intersected);

        if (this._isRotating) {

            const objWorldPos = new Vector3();
            this.object.getWorldPosition(objWorldPos);
            this._objectProject.copy(objWorldPos);
                // console.log(`worldPosX:${this._objectProject.x}, worldPosY:${this._objectProject.y}`);
            this._objectLeftProject.set(this._objectProject.x - this._radius, this._objectProject.y, this._objectProject.z);
            this._objectRightProject.set(this._objectProject.x + this._radius, this._objectProject.y, this._objectProject.z);
            this._objectProject.project(this.activeCamera);
            // console.log(`projPosX:${this._objectProject.x}, projPosY:${this._objectProject.y}`);
            this._objectLeftProject.project(this.activeCamera);
            this._objectRightProject.project(this.activeCamera);                                    

            if (this._mouse.x >= this._objectLeftProject.x && this._mouse.x <= this._objectRightProject.x || this._isPicked) {

                const deltaX = Math.abs(this._intersected.x - objWorldPos.x) / 10;
                const deltaY = Math.abs(this._intersected.y - objWorldPos.y) / 40;
                // console.log(`deltaX: ${deltaX}`);
                let radianZ = this._mouse.x >= this._objectProject.x ? dir.y * ROT_SPEED_Z * deltaX : - dir.y * ROT_SPEED_Z * deltaX;
                // let radianZ = this._mouse.x >= this._objectProject.x ? dir.y * ROT_SPEED_Z: - dir.y * ROT_SPEED_Z;

                const dirX = dir.x * deltaY;
                if (this._mouse.x < this._objectProject.x && this._mouse.y >= this._objectProject.y) {
                    radianZ += - dirX / ROT_DOWN_SPEED_Z;
                } else if (this._mouse.x >= this._objectProject.x && this._mouse.y >= this._objectProject.y) {
                    radianZ += - dirX / ROT_DOWN_SPEED_Z;
                } else if (this._mouse.x >= this._objectProject.x && this._mouse.y < this._objectProject.y) {
                    radianZ += dirX / ROT_DOWN_SPEED_Z;
                } else if (this._mouse.x < this._objectProject.x && this._mouse.y < this._objectProject.y) {
                    radianZ += dirX / ROT_DOWN_SPEED_Z;
                }

                // const radianX = this._mouse.y >= this._objectProject.y ? - dir.x * ROT_SPEED_X * deltaY : dir.x * ROT_SPEED_X * deltaY;
                
                // console.log(`radianX: ${radianX}`);
                this.object.rotateOnWorldAxis(Y_AXIS, dir.x * ROT_SPEED_Y);
                this.object.rotateOnWorldAxis(Z_AXIS, radianZ);
                this.object.rotateOnWorldAxis(X_AXIS, - dir.y * ROT_SPEED_X);
                // this.object.rotateOnAxis(X_AXIS, radianX);


            } else {

                const radianZ = this._mouse.x >= this._objectProject.x ? dir.y * ROT_SPEED_Z : - dir.y * ROT_SPEED_Z;
                this.object.rotateOnWorldAxis(Z_AXIS, radianZ);

            }

        }

        if (this._isMoving) {

            this.object.position.add(dir);

            this._modelPosition.value.copy(this.object.position);

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